export const Fragment = Symbol("sbfx-dom-fragment");

export type DomComponent = (props: any) => DomChild;
export type DomChild =
  | DomVNode
  | DomPortal
  | string
  | number
  | boolean
  | null
  | undefined
  | DomChild[];

type DomVNode = {
  type: string | DomComponent | typeof Fragment;
  props: Record<string, unknown> & { children?: DomChild };
};

type DomPortal = {
  type: typeof portalType;
  child: DomChild;
  target: Element;
};

type HookEffect = {
  cleanup?: () => void;
  dependencies?: unknown[];
  effect: () => void | (() => void);
  pending: boolean;
};

type ComponentInstance = {
  hooks: unknown[];
  hookIndex: number;
  root: DomRoot;
};

type FocusSnapshot = {
  path?: string;
  selectionEnd?: number | null;
  selectionStart?: number | null;
};

const portalType = Symbol("sbfx-dom-portal");
const svgNamespace = "http://www.w3.org/2000/svg";
const eventHandlersKey = Symbol("sbfx-event-handlers");
const eventDispatchersKey = Symbol("sbfx-event-dispatchers");
const refKey = Symbol("sbfx-ref");
const booleanPropertyNames = new Set([
  "checked",
  "disabled",
  "hidden",
  "multiple",
  "open",
  "required",
  "selected",
]);
let currentInstance: ComponentInstance | null = null;
let generatedId = 0;
let eventDispatchDepth = 0;
const pendingEventRoots = new Set<DomRoot>();

export function createElement(
  type: DomVNode["type"],
  props: Record<string, unknown> | null,
  ...children: DomChild[]
): DomVNode {
  return {
    type,
    props: {
      ...(props ?? {}),
      ...(children.length === 0
        ? {}
        : { children: children.length === 1 ? children[0] : children }),
    },
  };
}

export function createPortal(child: DomChild, target: Element): DomPortal {
  return { type: portalType, child, target };
}

export function useEffect(
  effect: () => void | (() => void),
  dependencies?: unknown[],
): void {
  const instance = requireInstance("useEffect");
  const index = instance.hookIndex++;
  const previous = instance.hooks[index] as HookEffect | undefined;
  const pending =
    !previous ||
    dependencies === undefined ||
    previous.dependencies === undefined ||
    !sameDependencies(previous.dependencies, dependencies);
  instance.hooks[index] = {
    cleanup: previous?.cleanup,
    dependencies,
    effect,
    pending,
  } satisfies HookEffect;
}

export function useId(): string {
  const instance = requireInstance("useId");
  const index = instance.hookIndex++;
  if (!instance.hooks[index]) {
    generatedId += 1;
    instance.hooks[index] = `sbfx-dom-${generatedId}`;
  }
  return instance.hooks[index] as string;
}

export function useRef<Value>(initialValue: Value): { current: Value } {
  const instance = requireInstance("useRef");
  const index = instance.hookIndex++;
  if (!instance.hooks[index]) {
    instance.hooks[index] = { current: initialValue };
  }
  return instance.hooks[index] as { current: Value };
}

export function useState<Value>(
  initialValue: Value | (() => Value),
): [Value, (value: Value | ((current: Value) => Value)) => void] {
  const instance = requireInstance("useState");
  const index = instance.hookIndex++;
  if (!(index in instance.hooks)) {
    instance.hooks[index] =
      typeof initialValue === "function"
        ? (initialValue as () => Value)()
        : initialValue;
  }
  const setValue = (value: Value | ((current: Value) => Value)) => {
    const current = instance.hooks[index] as Value;
    const next =
      typeof value === "function"
        ? (value as (current: Value) => Value)(current)
        : value;
    if (Object.is(current, next)) return;
    instance.hooks[index] = next;
    instance.root.scheduleRender();
  };
  return [instance.hooks[index] as Value, setValue];
}

export function mountDom(
  component: DomComponent,
  props: Record<string, unknown>,
  container: HTMLElement,
) {
  const root = new DomRoot(component, props, container);
  root.render();
  return {
    destroy: () => root.destroy(),
    update: (nextProps: Record<string, unknown>) => root.update(nextProps),
  };
}

class DomRoot {
  component: DomComponent;
  props: Record<string, unknown>;
  container: HTMLElement;
  instances = new Map<string, ComponentInstance>();
  usedInstances = new Set<string>();
  portalMounts = new Map<string, HTMLElement>();
  usedPortalPaths = new Set<string>();
  renderScheduled = false;
  destroyed = false;

  constructor(
    component: DomComponent,
    props: Record<string, unknown>,
    container: HTMLElement,
  ) {
    this.component = component;
    this.props = props;
    this.container = container;
  }

  update(props: Record<string, unknown>) {
    this.props = props;
    this.render();
  }

  scheduleRender() {
    if (this.destroyed) return;
    if (eventDispatchDepth > 0) {
      pendingEventRoots.add(this);
      return;
    }
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    queueMicrotask(() => {
      this.renderScheduled = false;
      if (!this.destroyed) this.render();
    });
  }

  render() {
    if (this.destroyed) return;
    const focus = captureFocus();
    this.usedInstances.clear();
    this.usedPortalPaths.clear();
    const output = this.renderNode(
      createElement(this.component, this.props),
      "root",
      undefined,
    );
    morphChildren(this.container, output);
    this.cleanupUnusedInstances();
    this.cleanupUnusedPortals();
    this.flushEffects();
    restoreFocus(focus);
  }

  renderNode(
    child: DomChild,
    path: string,
    namespace: string | undefined,
  ): Node {
    if (
      child === null ||
      child === undefined ||
      child === false ||
      child === true
    ) {
      return document.createTextNode("");
    }
    if (typeof child === "string" || typeof child === "number") {
      return document.createTextNode(String(child));
    }
    if (Array.isArray(child)) {
      const fragment = document.createDocumentFragment();
      child.forEach((entry, index) => {
        fragment.append(this.renderNode(entry, `${path}.${index}`, namespace));
      });
      return fragment;
    }
    if (child.type === portalType) {
      const portalNode = this.renderNode(child.child, `${path}.portal`, undefined);
      let mount = this.portalMounts.get(path);
      if (!mount) {
        mount = document.createElement("div");
        mount.dataset.sbfxDomPortal = path;
        mount.style.display = "contents";
        this.portalMounts.set(path, mount);
      }
      if (mount.parentElement !== child.target) child.target.append(mount);
      morphChildren(mount, portalNode);
      this.usedPortalPaths.add(path);
      return document.createTextNode("");
    }
    if (child.type === Fragment) {
      return this.renderNode(child.props.children, `${path}.fragment`, namespace);
    }
    if (typeof child.type === "function") {
      const componentPath = `${path}:${child.props.key ?? child.type.name ?? "component"}`;
      const instance =
        this.instances.get(componentPath) ??
        { hooks: [], hookIndex: 0, root: this };
      instance.hookIndex = 0;
      this.instances.set(componentPath, instance);
      this.usedInstances.add(componentPath);
      const previousInstance = currentInstance;
      currentInstance = instance;
      try {
        return this.renderNode(
          child.type(child.props),
          `${componentPath}.output`,
          namespace,
        );
      } finally {
        currentInstance = previousInstance;
      }
    }

    const nextNamespace =
      namespace === svgNamespace || child.type === "svg"
        ? svgNamespace
        : undefined;
    const element = nextNamespace
      ? document.createElementNS(nextNamespace, child.type)
      : document.createElement(child.type);
    applyProps(element, child.props, path);
    const children = normalizeChildren(child.props.children);
    children.forEach((entry, index) => {
      const key =
        typeof entry === "object" &&
        entry !== null &&
        !Array.isArray(entry) &&
        "props" in entry
          ? (entry as DomVNode).props.key
          : undefined;
      element.append(
        this.renderNode(
          entry,
          `${path}.${key === undefined ? index : `key-${String(key)}`}`,
          nextNamespace,
        ),
      );
    });
    return element;
  }

  flushEffects() {
    for (const instance of this.instances.values()) {
      for (const hook of instance.hooks) {
        if (!isHookEffect(hook) || !hook.pending) continue;
        hook.cleanup?.();
        const cleanup = hook.effect();
        hook.cleanup = typeof cleanup === "function" ? cleanup : undefined;
        hook.pending = false;
      }
    }
  }

  cleanupUnusedInstances() {
    for (const [path, instance] of this.instances) {
      if (this.usedInstances.has(path)) continue;
      cleanupInstance(instance);
      this.instances.delete(path);
    }
  }

  cleanupUnusedPortals() {
    for (const [path, mount] of this.portalMounts) {
      if (this.usedPortalPaths.has(path)) continue;
      mount.remove();
      this.portalMounts.delete(path);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const mount of this.portalMounts.values()) mount.remove();
    this.portalMounts.clear();
    for (const instance of this.instances.values()) cleanupInstance(instance);
    this.instances.clear();
    this.container.remove();
  }
}

function applyProps(
  element: Element,
  props: Record<string, unknown>,
  path: string,
) {
  for (const [name, value] of Object.entries(props)) {
    if (name === "children" || name === "key" || value === undefined || value === null) {
      continue;
    }
    if (name === "ref" && isRef(value)) {
      value.current = element;
      (element as ElementWithRuntime)[refKey] = value;
      continue;
    }
    if (name === "style" && isRecord(value) && element instanceof HTMLElement) {
      for (const [property, styleValue] of Object.entries(value)) {
        element.style.setProperty(toKebabCase(property), String(styleValue));
      }
      continue;
    }
    if (name.startsWith("on") && typeof value === "function") {
      const eventName = eventNameForProp(element, name);
      setEventHandler(element, eventName, value as EventListener);
      continue;
    }
    const attributeName =
      name === "className" ? "class" : name === "htmlFor" ? "for" : name;
    if (typeof value === "boolean") {
      if (attributeName.startsWith("aria-") || attributeName.startsWith("data-")) {
        element.setAttribute(attributeName, String(value));
        continue;
      }
      if (booleanPropertyNames.has(attributeName) && attributeName in element) {
        try {
          (element as unknown as Record<string, unknown>)[attributeName] = value;
        } catch {
          // Read-only DOM properties retain their attribute representation.
        }
      }
      if (value) element.setAttribute(attributeName, "");
      continue;
    }
    if (
      (attributeName === "value" || attributeName === "checked") &&
      attributeName in element
    ) {
      (element as unknown as Record<string, unknown>)[attributeName] = value;
      continue;
    }
    element.setAttribute(attributeName, String(value));
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement ||
    element instanceof HTMLAnchorElement
  ) {
    element.dataset.sbfxDomPath = path;
  }
  element.setAttribute("data-sbfx-dom-node", path);
}

type ElementWithRuntime = Element & {
  [eventDispatchersKey]?: Map<string, EventListener>;
  [eventHandlersKey]?: Map<string, EventListener>;
  [refKey]?: { current: unknown };
};

function setEventHandler(
  element: Element,
  eventName: string,
  handler: EventListener,
) {
  const runtimeElement = element as ElementWithRuntime;
  runtimeElement[eventHandlersKey] ??= new Map();
  runtimeElement[eventDispatchersKey] ??= new Map();
  runtimeElement[eventHandlersKey]!.set(eventName, handler);
  if (runtimeElement[eventDispatchersKey]!.has(eventName)) return;
  const dispatcher: EventListener = (event) => {
    eventDispatchDepth += 1;
    try {
      runtimeElement[eventHandlersKey]?.get(eventName)?.call(element, event);
    } finally {
      eventDispatchDepth -= 1;
      if (eventDispatchDepth === 0) {
        const roots = [...pendingEventRoots];
        pendingEventRoots.clear();
        for (const root of roots) {
          if (!root.destroyed) root.render();
        }
      }
    }
  };
  runtimeElement[eventDispatchersKey]!.set(eventName, dispatcher);
  element.addEventListener(eventName, dispatcher);
}

function morphChildren(parent: Element, nextContent: Node) {
  const nextNodes =
    nextContent instanceof DocumentFragment
      ? [...nextContent.childNodes]
      : [nextContent];
  const currentNodes = [...parent.childNodes];
  const length = Math.max(currentNodes.length, nextNodes.length);
  for (let index = 0; index < length; index += 1) {
    const current = currentNodes[index];
    const next = nextNodes[index];
    if (!current && next) {
      parent.append(next);
      continue;
    }
    if (current && !next) {
      current.remove();
      continue;
    }
    if (current && next) morphNode(current, next);
  }
}

function morphNode(current: Node, next: Node) {
  if (!nodesMatch(current, next)) {
    current.parentNode?.replaceChild(next, current);
    return;
  }
  if (current instanceof Text && next instanceof Text) {
    if (current.data !== next.data) current.data = next.data;
    return;
  }
  if (!(current instanceof Element) || !(next instanceof Element)) return;

  const currentAttributes = new Set(current.getAttributeNames());
  for (const attributeName of next.getAttributeNames()) {
    const value = next.getAttribute(attributeName);
    if (current.getAttribute(attributeName) !== value && value !== null) {
      current.setAttribute(attributeName, value);
    }
    currentAttributes.delete(attributeName);
  }
  for (const attributeName of currentAttributes) current.removeAttribute(attributeName);

  for (const propertyName of booleanPropertyNames) {
    if (propertyName in current && propertyName in next) {
      try {
        (current as unknown as Record<string, unknown>)[propertyName] =
          (next as unknown as Record<string, unknown>)[propertyName];
      } catch {
        // Some SVG or read-only properties expose names shared with HTML controls.
      }
    }
  }
  if (
    "value" in current &&
    "value" in next &&
    document.activeElement !== current
  ) {
    (current as unknown as { value: unknown }).value =
      (next as unknown as { value: unknown }).value;
  }

  const currentRuntime = current as ElementWithRuntime;
  const nextRuntime = next as ElementWithRuntime;
  currentRuntime[eventHandlersKey] = new Map(nextRuntime[eventHandlersKey] ?? []);
  for (const eventName of currentRuntime[eventHandlersKey].keys()) {
    if (!currentRuntime[eventDispatchersKey]?.has(eventName)) {
      setEventHandler(
        current,
        eventName,
        currentRuntime[eventHandlersKey].get(eventName)!,
      );
    }
  }
  currentRuntime[refKey] = nextRuntime[refKey];
  if (currentRuntime[refKey]) currentRuntime[refKey]!.current = current;

  const fragment = document.createDocumentFragment();
  fragment.append(...next.childNodes);
  morphChildren(current, fragment);
}

function nodesMatch(current: Node, next: Node) {
  if (current.nodeType !== next.nodeType) return false;
  if (current instanceof Text && next instanceof Text) return true;
  if (!(current instanceof Element) || !(next instanceof Element)) return true;
  return (
    current.namespaceURI === next.namespaceURI &&
    current.tagName === next.tagName &&
    current.getAttribute("data-sbfx-dom-node") ===
      next.getAttribute("data-sbfx-dom-node")
  );
}

function eventNameForProp(element: Element, prop: string): string {
  if (prop === "onChange") {
    return element instanceof HTMLSelectElement ? "change" : "input";
  }
  return prop.slice(2).toLowerCase();
}

function normalizeChildren(children: DomChild | undefined): DomChild[] {
  if (children === undefined) return [];
  const normalized: DomChild[] = [];
  const append = (child: DomChild) => {
    if (Array.isArray(child)) {
      for (const nested of child) append(nested);
      return;
    }
    normalized.push(child);
  };
  append(children);
  return normalized;
}

function sameDependencies(left: unknown[], right: unknown[]) {
  return left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
}

function requireInstance(hookName: string) {
  if (!currentInstance) {
    throw new Error(`${hookName} must be called while rendering a DOM component`);
  }
  return currentInstance;
}

function cleanupInstance(instance: ComponentInstance) {
  for (const hook of instance.hooks) {
    if (isHookEffect(hook)) hook.cleanup?.();
  }
}

function isHookEffect(value: unknown): value is HookEffect {
  return isRecord(value) && typeof value.effect === "function" && "pending" in value;
}

function isRef(value: unknown): value is { current: unknown } {
  return isRecord(value) && "current" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toKebabCase(value: string) {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function captureFocus(): FocusSnapshot {
  const active = document.activeElement;
  if (
    !(active instanceof HTMLInputElement) &&
    !(active instanceof HTMLTextAreaElement) &&
    !(active instanceof HTMLSelectElement) &&
    !(active instanceof HTMLButtonElement) &&
    !(active instanceof HTMLAnchorElement)
  ) {
    return {};
  }
  return {
    path: active.dataset.sbfxDomPath,
    ...("selectionStart" in active
      ? {
          selectionStart: active.selectionStart,
          selectionEnd: active.selectionEnd,
        }
      : {}),
  };
}

function restoreFocus(snapshot: FocusSnapshot) {
  if (!snapshot.path) return;
  const next = document.querySelector<HTMLElement>(
    `[data-sbfx-dom-path="${CSS.escape(snapshot.path)}"]`,
  );
  if (!next) return;
  next.focus();
  if (
    (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) &&
    snapshot.selectionStart !== undefined
  ) {
    next.setSelectionRange(snapshot.selectionStart ?? 0, snapshot.selectionEnd ?? 0);
  }
}
