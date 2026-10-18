import { DesignAutomationHubCore } from "./core.mjs";
import { registerDesignAutomationHub } from "./host.mjs";
import { createDesignAutomationHubServer } from "./server.mjs";

export function createCompatibleDesignAutomationHub({
  projectRoot = process.cwd(),
  hostAdapter,
  authenticate,
  scheduleTask,
} = {}) {
  const hostRegistration = registerDesignAutomationHub(hostAdapter);
  const core = new DesignAutomationHubCore({ projectRoot });
  const server = createDesignAutomationHubServer({
    core,
    authenticate,
    hostRegistration,
    scheduleTask,
  });
  return { core, server, hostRegistration };
}
