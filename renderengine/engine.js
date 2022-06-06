class HEvent {
  #VNode;
  #event;
  #time;
  #args;
  #utime;
  constructor(vnode, event, args) {
    this.#utime = Date.now();
    this.#time = new Date();
    this.#VNode = vnode;
    this.#event = event;
    this.#args = args;
  }

  get time() {
    return this.#time;
  }
  get utime() {
    return this.#utime;
  }
  get unixtime() {
    return this.#utime;
  }
  get event() {
    return this.#event;
  }
  get VNode() {
    return this.#VNode;
  }
  get args() {
    return this.#args;
  }
}

class VNode {
  #children = [];
  #attrs = [];
  events = [];
  tag = "";

  constructor(tag, attrs = { events: {} }, ...childs) {
    let children = childs || [];
    attrs = attrs || { events: {} };
    if (typeof tag == "function") {
      let node = tag(attrs, children);
      tag = "unknown";
      children = node instanceof Array ? node : [node];
      attrs = [];
    } else {
      children = children[0] instanceof Array ? children[0] : [children[0]];
    }
    if (!attrs.events || !(attrs.events instanceof Array)) {
      attrs.events = {};
    }
    let events = attrs.events;
    delete attrs.events;

    let attrVals = Object.values(attrs);
    let attrKeys = Object.keys(attrs);
    attrKeys = attrKeys.map((el, i) => {
      if (el.startsWith("on")) {
        events[el.substr(2)] = attrVals[i];
        return null;
      }
      return el;
    });

    if (typeof this.tag != "string" && this.tag == "")
      throw new Error("Attribute has to be a String and not empty.");

    attrs = {};
    attrKeys.forEach((el, i) =>
      el != null ? (attrs[el] = attrVals[i]) : null
    );

    this.#children = children;
    this.#attrs = attrs;
    this.events = events;
    this.tag = tag;
  }

  render() {
    let element = document.createElement(this.tag);

    element.setAttribute("renderengine-el", "");

    let attrKeys = Object.keys(this.#attrs);
    attrKeys.forEach((key) => {
      if (key != null && key != undefined && key != "")
        element.setAttribute(key, this.#attrs[key]);
    });

    Object.keys(this.events).forEach((ev) => {
      element.addEventListener(ev, (...args) =>
        this.events[ev](new HEvent(this, args[0], args))
      );
    });
    while (
      this.#children.reduce(
        (acc, el) => (el instanceof Array ? true : acc),
        false
      )
    ) {
      let chc = this.#children.map((el) => el);
      this.#children = [];

      chc.forEach((el) => {
        if (el instanceof Array) {
          el.forEach((el) => this.#children.push(el));
        } else {
          this.#children.push(el);
        }
      });      
    }

    this.#children.forEach((node) => {
      element.appendChild(
        node instanceof VNode ? node.render() : document.createTextNode(node)
      );
    });

    if (typeof element.getAttribute("ref") == "string") {
      this.#attrs.ref ? (this.#attrs.ref.current = element) : null;
      element.removeAttribute("ref");
    }
    return element;
  }

  addChild(children) {
    this.#children.push(children);
  }

  remChild(children) {
    this.#children = this.#children.filter((el) => el != children);
  }

  setAttribute(name, value) {
    if (name.startsWith("on")) this.events[name.substr(2)] = value;
    else this.#attrs[name] = value;
  }

  get attributes() {
    return { ...this.#attrs, events: this.events };
  }

  getAttribute(name) {
    return this.#attrs[name];
  }

  get children() {
    return this.#children;
  }
}

class VDOM {
  #state = {};
  #mnt = document.body;
  /**
   *
   * @param {T} state
   * @returns {Array<VNode>}
   */
  #children = (state) => [];

  /**
   *
   * @param {{state: T, mnt: HTMLElement, children: (state: T)=>Array<VNode>, subscriptions: {[name: string]: (event: Event)=>null}}} param0
   */
  constructor(
    { state, mnt, children, subscriptions } = {
      state: {},
      mnt: document.body,
      children: (state) => [],
      subscriptions: {},
    }
  ) {
    state = state || {};
    mnt = mnt instanceof HTMLElement ? mnt : document.body;
    children = typeof children == "function" ? children : (state) => [];
    subscriptions = subscriptions || {};

    for (let k in Object.keys(subscriptions)) {
      mnt.addEventListener(k, subscriptions[k]);
    }
    this.#children = children;
    this.#mnt = mnt;
    this.#state = state;
    this.render();
  }

  async render() {
    i = 0;
    ieffect = 0;
    iref = 0;

    Object.values(this.#mnt.children).forEach((c) => {
      if (c.getAttribute("renderengine-el") != null) this.#mnt.removeChild(c);
    });

    let childs = await this.#children(this.#state);
    childs = childs instanceof Array ? childs : [childs];

    while (childs.reduce((acc, val)=>val instanceof Array?true:acc, false)) {
    let newchilds = childs;
    childs = [];

    newchilds.forEach(el=>el instanceof Array?childs.push(...el):childs.push(el));
  }

    childs.forEach(async (c) => {
      this.#mnt.appendChild(
        typeof c == "string" ? document.createTextNode(c) : await c.render()
      );
    });

    effects = effects.map((el) => {
      if (typeof el.func == "function" && el.changed) {
        el.ret = el.func();
        el.changed = false;
      }
      return el;
    });
  }
}

let vdom;

export function rerender() {
  vdom?.render?.();
}

function waitForLoad() {
  return new Promise((res) => {
    document?.body ? res() : null;
    window.addEventListener("load", res);
  });
}

/**
 *
 * @param {{state: T, mnt: HTMLElement, children: (state: T)=>Array<VNode>, subscriptions: {[name: string]: (event: Event)=>null}}} parameters
 */
export async function render(
  parameters = {
    state: {},
    mnt: document.body,
    children: (state) => {},
    subscriptions: {},
  }
) {
  await waitForLoad();
  vdom = new VDOM(parameters);
}

let states = [];
let i = 0;
let idstates = {};

/**
 *
 * @param {T} stdval the standard value
 * @returns {[T, (val: T)=>void]}
 */
export function useState(stdval) {
  if (states[i] == null || states[i] == undefined) states[i] = stdval;
  let index = i;
  function setState(val) {
    states[index] = val;
    rerender();
  }
  i++;
  return [states[index], setState];
}

/**
 *
 * @param {string} id The Identifier
 * @param {T} stdval The standard value
 * @returns {[T, (val: T)=>void]}
 */
export function useIDState(id, stdval) {
  if (idstates[id] == null || idstates[id] == undefined) idstates[id] = stdval;

  function setState(val) {
    idstates[id] = val;
    rerender();
  }

  return [idstates[id], setState];
}

/**
 *
 * @param {string} title
 */
export function setTitle(title) {
  document.title = title;
}

/**
 * @returns {string}
 */
export function getTitle() {
  return document.title;
}

/**
 *
 * @param {string} tag
 * @param {{[name]: string, events: {[name]: string}}} attrs
 * @param {Array<VNode|string>} children
 * @returns {VNode}
 */
export function h(tag, attrs, ...children) {
  return new VNode(tag, attrs, children);
}

let effects = [];
let ieffect = 0;

export function useEffect(func, to_change) {
  if (effects[ieffect] == null || effects[ieffect] == undefined) {
    effects[ieffect] = {
      func: func,
      lastchange: to_change,
      ret: undefined,
      changed: true,
    };
  } else {
    if (
      effects[ieffect].lastchange != null &&
      effects[ieffect].lastchange != undefined &&
      effects[ieffect].lastchange == to_change
    ) {
      effects[ieffect].changed = false;
    } else {
      effects[ieffect].changed = true;
      effects[ieffect].lastchange = to_change;
    }
    effects[ieffect].func = func;
  }
  ieffect++;
}

const refs = [];
let iref = 0;

export function useRef(stdobj) {
  if (refs[iref] == null || refs[iref] == undefined) {
    refs[iref] = {
      current: stdobj,
    };
  }
  iref++;
  return refs[iref - 1];
}
