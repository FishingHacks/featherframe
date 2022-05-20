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
    if (typeof tag == "function") {
      let node = tag(attrs, childs);
      attrs = node.attributes;
      tag = node.tag;
      childs = node.children;
    }

    let children = childs || [];
    attrs = attrs || { events: {} };
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

    this.#children = children;
    this.#attrs = attrs;
    this.events = events;
    this.tag = tag;
  }

  render() {
    let element = document.createElement(this.tag);

    element.setAttribute("renderengine-el", "")

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

    this.#children.forEach((node) =>
      element.appendChild(
        node instanceof VNode ? node.render() : document.createTextNode(node)
      )
    );

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
      children: (state) => {},
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
    Object.values(this.#mnt.children).forEach((c) => {
      if (c.getAttribute("renderengine-el")!=null) this.#mnt.removeChild(c);
    });

    let childs = await this.#children(this.#state);

    childs.forEach(async (c) => this.#mnt.appendChild(await c.render()));
  }
}

let vdom;

export function rerender() {
  i = 0;
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
  await waitForLoad;
  i = 0;
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
  i++;
  if (states[i] == null || states[i] == undefined) states[i] = stdval;
  let index = i;
  function setState(val) {
    states[index] = val;
    rerender();
  }
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
