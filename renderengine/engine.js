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
    children = children[0] instanceof Array ? children[0] : [children[0]];

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

  async render(xmlns = "") {
    if (typeof this.tag == "function")
      this.#children = await this.tag(this.#attrs, this.#children);

    this.#attrs.xmlns ? (xmlns = this.#attrs.xmlns) : null;

    let element = null;

    if (xmlns) {
      element = document.createElementNS(
        xmlns,
        typeof this.tag == "function" ? "unknown" : this.tag
      );
    } else {
      element = document.createElement(
        typeof this.tag == "function" ? "unknown" : this.tag
      );
    }

    element.setAttribute("renderengine-el", "");

    let attrKeys = Object.keys(this.#attrs);
    attrKeys.forEach((key) => {
      if (key != null && key != undefined && key != "" && key != "xmlns");
      element.setAttribute(key, this.#attrs[key]);
    });

    Object.keys(this.events).forEach((ev) => {
      element.addEventListener(ev, (...args) =>
        this.events[ev](new HEvent(this, args[0], args))
      );
    });
    if (!(this.#children instanceof Array)) this.#children = [this.#children];
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

    this.#children.forEach(async (node) => {
      element.appendChild(
        node instanceof VNode
          ? await node.render(xmlns)
          : document.createTextNode(node)
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

    try {
      let childs = await this.#children(this.#state);
      childs = childs instanceof Array ? childs : [childs];

      while (
        childs.reduce((acc, val) => (val instanceof Array ? true : acc), false)
      ) {
        let newchilds = childs;
        childs = [];

        newchilds.forEach((el) =>
          el instanceof Array ? childs.push(...el) : childs.push(el)
        );
      }

      const error = false;
      childs.forEach(async (c) => {
        try {
          this.#mnt.appendChild(
            typeof c == "string" ? document.createTextNode(c) : await c.render()
          );
        } catch (e) {
          error = e;
        }
      });
      if (error) throw e;

      await new Promise((r) => setTimeout(r, 0)); // Bugfix for a weird problem, where it doesn't clear out the page when a new render event is caused immediately in useEffect

      effects = effects.map((el) => {
        if (typeof el.func == "function" && el.changed) {
          el.ret = el.func();
          el.changed = false;
        }
        return el;
      });
    } catch (e) {
      console.error(
        "An error occured while trying to render the application",
        e
      );

      let stacktrace = e.stack;

      let flc = stacktrace.match(/\(([^ \n])+\.js:[0-9]+:[0-9]+\)/)[0];
      flc = flc.substr(1, flc.length - 2).split(":");

      let c = Number(flc.pop());
      let l = Number(flc.pop());
      let f = flc.join(":");

      let errel = document.createElement("div");

      errel.classList.add("errel");
      errel.setAttribute("renderengine-el", "");

      errel.style.color = "#fff";

      document.body.style.backgroundColor = "#24292f";

      let titleel = document.createElement("h1");
      titleel.textContent =
        "An Error occured whilst trying to render the Application";
      errel.append(titleel);

      let stackel = document.createElement("p");
      stackel.setAttribute(
        "style",
        "width: max-content; font-family: monospace; border: 3px white solid; border-radius: 15px; padding: 10px; background: rgba(168, 91, 91, 0.467);"
      );
      stackel.innerHTML = stacktrace
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll(" ", "&nbsp;")
        .replaceAll('"', "&quot;")
        .replaceAll("\n", "<br />");
      errel.append(stackel);

      let contents = await await fetch(f).then((el) => el.text());

      contents = contents.split("\n").map((el, i) => {
        if (i < l + 2 && i > l - 4) return el;
        else return null;
      });
      let newcontents = [];
      contents.forEach((el) =>
        typeof el == "string" ? newcontents.push(el) : null
      );
      contents = newcontents.map(
        (el, i) =>
          `<span style="background-color:rgba(95, 84, 84, 0.333);color:#ddd;">${
            l - 2 + i
          }${
            (l - 2 + i).toString().length == l
              ? "&nbsp;"
              : (l - 2 + i).toString().length < l
              ? "&nbsp;&nbsp;"
              : ""
          }|&nbsp;</span>${el
            .replaceAll(" ", "&nbsp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")}`
      );

      contents = [
        ...contents.slice(0, 3),
        '<span style="color: #f00; font-weight: bold;">' +
          addArrowUpAtChar(c + 4 + l.toString().length).replaceAll(
            " ",
            "&nbsp;"
          ) +
          "</span>",
        ...contents.slice(3),
      ];

      let codep = document.createElement("p");
      codep.innerHTML = contents.join("\n").replaceAll("\n", "<br />");
      codep.setAttribute("style", "font-family: monospace;");
      errel.append(codep);

      this.#mnt.appendChild(errel);
    }
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
    if (typeof val == "function") val = val(states[index]);
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
    if (typeof val == "function") val = val(idstates[id]);
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

function addArrowUpAtChar(c) {
  if (typeof c != "number" && isNaN(Number(c))) return;
  if (typeof c != "number") c = Number(c);
  let ret = "";
  for (let i = 1; i < c; i++) {
    ret += " ";
  }
  return ret + "^";
}

/**
 *
 * @param {(T, any)=>T} reducer get's called, when dispatch is called with the action and the current state
 * @param {T} initialValue the initial Value
 * @returns {[T, (any)=>void]} the State and the dispatch function
 */
export function useReducer(reducer, initialValue) {
  const [state, setState] = useState(initialValue);

  function dispatch(action) {
    setState(reducer(state, action));
  }

  return [state, dispatch];
}

const contexts = {};

/**
 * @param {any} el the value of the context
 * @param {string} key the key of the context
 */
export function createContext(el, key) {
  contexts[key] = el;
}

/**
 * @param {string} key the key of the context
 * @returns {any} the value set for the context
 */
export function useContext(key) {
  return contexts[key];
}

function errorPromise(err) {
  return new Promise((res, rej) => rej(err));
}

const loadedModules = {};

function loadModule(modulepath, modulename) {
  if (typeof modulepath != "string")
    return errorPromise("[ERR] module name " + modulepath + " is not a string");
  modulename = modulepath;
  if (!modulepath.startsWith("/")) modulepath = "/" + modulepath;
  modulepath = "/packages" + modulepath;
  if (!modulepath.endsWith(".js") && !modulepath.endsWith(".mjs"))
    modulepath += (modulepath.endsWith("/") ? "" : "/") + "index.js";

  return new Promise((r) => {
    import(modulepath).then((exportedValues) => {
      loadedModules[modulename] = exportedValues;
      r();
    });
  });
}

export function loadModules(modules = []) {
  let promises = modules.map((el) => loadModule(el));
  return new Promise((res) => {
    let unresolved = promises.length;
    promises.forEach((el, i) => {
      el.then((empty) => {
        unresolved--;
        if (unresolved < 1) res();
      }).catch((err) => {
        console.error(
          "[ERR] Error while loading module " + modules[i] + ": " + err
        );
        unresolved--;
        if (unresolved < 1) res();
      });
    });
  });
}

export function require(module) {
  if (!loadedModules[module])
    throw new Error("[ERR] module " + module + " wasn't yet loaded");
  return loadedModules[module];
}

export function reset() {
  i = 0;
  idstates = {};
  ieffect = 0;
  iref = 0;
  effects = [];
  states = [];
}