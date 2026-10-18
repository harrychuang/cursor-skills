import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { DesignAutomationError, isInside } from "./contract.mjs";

const INITIAL_STATE = Object.freeze({ schemaVersion: 1, tasks: [] });

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class JsonTaskStore {
  constructor({ projectRoot, statePath = ".design-automation/state/tasks.json" } = {}) {
    this.projectRoot = fs.realpathSync(projectRoot);
    this.statePath = path.resolve(this.projectRoot, statePath);
    if (!isInside(this.projectRoot, this.statePath)) {
      throw new DesignAutomationError("unsafe-state-path", "Task state path escaped project root.");
    }
  }

  read() {
    if (!fs.existsSync(this.statePath)) return clone(INITIAL_STATE);
    if (fs.lstatSync(this.statePath).isSymbolicLink()) {
      throw new DesignAutomationError("unsafe-state-path", "Task state cannot be a symlink.");
    }
    const value = JSON.parse(fs.readFileSync(this.statePath, "utf8"));
    if (value?.schemaVersion !== 1 || !Array.isArray(value.tasks)) {
      throw new DesignAutomationError("invalid-task-state", "Task state schema is invalid.", { status: 500 });
    }
    return value;
  }

  write(state) {
    const directory = path.dirname(this.statePath);
    let existing = directory;
    while (!fs.existsSync(existing)) existing = path.dirname(existing);
    if (!isInside(this.projectRoot, fs.realpathSync(existing))) {
      throw new DesignAutomationError("unsafe-state-path", "Task state directory escaped project root.");
    }
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (!isInside(this.projectRoot, fs.realpathSync(directory))) {
      throw new DesignAutomationError("unsafe-state-path", "Task state directory escaped project root.");
    }
    const temporary = path.join(directory, `.tasks.${process.pid}.${crypto.randomUUID()}.tmp`);
    fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, this.statePath);
  }

  list({ projectId, fileKey } = {}) {
    return this.read().tasks
      .filter((task) => (!projectId || task.projectId === projectId) && (!fileKey || task.fileKey === fileKey))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(clone);
  }

  get(taskId) {
    const task = this.read().tasks.find((item) => item.id === taskId);
    return task ? clone(task) : null;
  }

  findByIdempotency({ projectId, fileKey, requestedBy, idempotencyKey } = {}) {
    const task = this.read().tasks.find((item) =>
      item.projectId === projectId
      && item.fileKey === fileKey
      && item.requestedBy === requestedBy
      && item.idempotencyKey === idempotencyKey);
    return task ? clone(task) : null;
  }

  create(task) {
    const state = this.read();
    if (state.tasks.some((item) => item.id === task.id)) {
      throw new DesignAutomationError("duplicate-automation-task", "Automation task id already exists.", { status: 409 });
    }
    state.tasks.push(clone(task));
    this.write(state);
    return clone(task);
  }

  compareAndSwap(taskId, expectedRevision, changes) {
    const state = this.read();
    const index = state.tasks.findIndex((item) => item.id === taskId);
    if (index < 0) throw new DesignAutomationError("unknown-automation-task", "Automation task was not found.", { status: 404 });
    const current = state.tasks[index];
    if (current.revision !== expectedRevision) {
      throw new DesignAutomationError("stale-task-revision", "Automation task revision changed.", { status: 409 });
    }
    state.tasks[index] = { ...current, ...clone(changes), revision: current.revision + 1 };
    this.write(state);
    return clone(state.tasks[index]);
  }
}
