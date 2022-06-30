function expandArray(childs) {
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
  return childs;
}

async function awaitForeach(arr, cb) {
  for (const i in arr) {
    if (!isNaN(i)) await cb(arr[i], Number(i), arr);
  }
  return;
}

const logEvents = feahterframeConfig.logEvents || false;

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

    if (typeof tag != "function") {
      attrs = {};
      attrKeys.forEach((el, i) =>
        el != null ? (attrs[el] = attrVals[i]) : null
      );
    }

    this.#children = children;
    this.#attrs = attrs;
    this.events = events;
    this.tag = tag;
    if (logEvents) console.log("created VNode", this);
  }

  async render(xmlns = "") {
    if (logEvents) console.log("rendering VNode", this);
    try {
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
        element.addEventListener(ev, (...args) => {
          typeof this.events[ev] != "function"
            ? console.error(
                "Value for event." + ev + " or on" + ev + " is not a function"
              )
            : this.events[ev](...args);
        });
      });

      this.#children = expandArray(this.#children);

      await awaitForeach(this.#children, async (node) => {
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
    } catch (e) {
      if (e.message.substr(0, 30) == "Error whilst trying to render ") throw e;
      throw new Error(
        "Error whilst trying to render " + this.tag + ": " + e.message
      );
    }
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
    if (logEvents) console.log("rendering...");
    i = 0;
    ieffect = 0;
    iref = 0;

    try {
      let childs = await this.#children(this.#state);
      childs = expandArray(childs);

      const left = { v: childs.length };

      let error = false;
      const children_to_append = [];
      await awaitForeach(childs, async (c) => {
        try {
          children_to_append.push(
            typeof c == "string" ? document.createTextNode(c) : await c.render()
          );
        } catch (e) {
          error = e;
        }
      });

      if (logEvents) console.log("removing old elements");
      Object.values(this.#mnt.children).forEach((c) => {
        if (c.getAttribute("renderengine-el") != null) this.#mnt.removeChild(c);
      });
      if (error) throw error;
      children_to_append.forEach((el) => this.#mnt.append(el));
      if (logEvents) console.log("Adding new Elements");
      effects = effects.map((el) => {
        if (typeof el.func == "function" && el.changed) {
          el.ret = el.func();
          el.changed = false;
        }
        return el;
      });
      if (logEvents) console.log("render completed");
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

      const style = document.createElement("style");
      style.textContent =
        "@font-face {\nfont-family: Poppins;src: url('/__featherframe/font/font.ttf') format('truetype'),}\n.errel,\n.errel > * {\n    font-family: 'Poppins', sans-serif;\n}";

      errel.append(style);

      errel.classList.add("errel");
      errel.setAttribute("renderengine-el", "");

      errel.style.color = "#fff";
      errel.style.padding = "50px";
      errel.style.background = "#24292f";

      let titleel = document.createElement("h1");
      titleel.textContent =
        "An Error occured whilst trying to render the Application";
      errel.append(titleel);

      let stackel = document.createElement("p");
      stackel.setAttribute(
        "style",
        "width: max-content; font-family: monospace; border: 3px white solid; border-radius: 15px; padding: 10px; background: rgba(168, 91, 91, 0.467);"
      );

      stacktrace = stacktrace
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll(" ", "&nbsp;")
        .replaceAll('"', "&quot;")
        .replaceAll("\n", "<br />");

      const expression =
        /(https?:\/\/[^\s]+\/[^\s)]{2,}|www\.[^\s]+\.[^\s)]{2,})/gi;
      const matches = expandArray(
        stacktrace.split("\n").map((el) => el.match(expression))
      );
      let results = [];

      for (const match in matches) {
        if (matches[match] != null) {
          let result = {};
          result["link"] = matches[match];
          result["startsAt"] = stacktrace.indexOf(matches[match]);
          result["endsAt"] =
            stacktrace.indexOf(matches[match]) + matches[match].length;
          results.push(result);
        }
      }

      let lastVal = { endsAt: 0 };

      stacktrace = results
        .map((el) => {
          const newResult = { ...el };
          newResult.oldlink = newResult.link;
          let _link = newResult.link.split(":");
          newResult.char = _link.pop() || 0;
          newResult.line = _link.pop() || 1;
          newResult.link = _link.join(":");
          newResult.stacktrace = stacktrace.substring(
            lastVal.endsAt,
            newResult.endsAt
          );
          const url = new URL(newResult.link);
          newResult.stacktrace = newResult.stacktrace.replaceAll(
            newResult.oldlink,
            `<a style="color: #999;decorations: none;" href="${
              url.origin + "/__featherframe/preview?url=" + url.pathname
            }" target="_blank">${
              newResult.link.split("/")[newResult.link.split("/").length - 1]
            }</a>`
          );
          lastVal = newResult;
          return newResult;
        })
        .map((el) => el.stacktrace)
        .join("");

      stackel.innerHTML = stacktrace + ")";
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
            (l - 2 + i).toString().length == l.toString().length
              ? "&nbsp;&nbsp;"
              : "&nbsp;"
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

      const rerenderBtn = document.createElement("button");
      rerenderBtn.textContent = "Rerender";
      rerenderBtn.onclick = rerender;

      rerenderBtn.style.padding = "5px";
      rerenderBtn.style.border = "0px solid green";
      rerenderBtn.style.borderRadius = "10px";
      rerenderBtn.style.cursor = "pointer";
      rerenderBtn.style.background = "green";
      rerenderBtn.style.color = "#fff";

      errel.append(rerenderBtn);

      const resetBtn = document.createElement("button");
      resetBtn.textContent = "Reset";
      resetBtn.onclick = () => {
        reset();
        rerender();
      };

      resetBtn.style.marginLeft = "7px";
      resetBtn.style.padding = "5px";
      resetBtn.style.border = "0px solid red";
      resetBtn.style.borderRadius = "10px";
      resetBtn.style.cursor = "pointer";
      resetBtn.style.background = "red";
      resetBtn.style.color = "#fff";

      errel.append(resetBtn);

      if (logEvents) console.log("removing old elements");
      Object.values(this.#mnt.children).forEach((c) => {
        if (c.getAttribute("renderengine-el") != null) this.#mnt.removeChild(c);
      });

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
  if (logEvents) console.log("using state#" + i.toString());
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
  if (logEvents) console.log("using State with id", id);
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
  if (logEvents) console.log("using Effect");
  if (effects[ieffect] == null || effects[ieffect] == undefined) {
    effects[ieffect] = {
      func: func,
      lastchange: to_change,
      ret: undefined,
      changed: true,
    };
  } else {
    if (
      effects[ieffect].lastchange instanceof Array &&
      to_change instanceof Array
    ) {
      const is_eq = true;
      effects[ieffect].lastchange.forEach((el, i) => {
        if (to_change[i] != el) is_eq = false;
      });
      to_change.forEach((el, i) => {
        if (effects[ieffect].lastchange[i] != el) is_eq = false;
      });
      if (is_eq) effects[ieffect].lastchange = to_change;
    }
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
  if (logEvents) console.log("using Reference");
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
  if (logEvents) console.log("new reducer created with value", initialValue);
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
  if (logEvents) console.log("Creating context", key, "with", el);
  contexts[key] = el;
}

/**
 * @param {string} key the key of the context
 * @returns {any} the value set for the context
 */
export function useContext(key) {
  if (logEvents) console.log("using context", key);
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
  if (logEvents) console.log("loading modules", modules);
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
  if (logEvents) console.log("trying to laod module", module.toString());
  if (!loadedModules[module])
    throw new Error("[ERR] module " + module + " wasn't yet loaded");
  return loadedModules[module];
}

export function reset() {
  if (logEvents) console.log("resetting...");
  i = 0;
  idstates = {};
  ieffect = 0;
  iref = 0;
  effects = [];
  states = [];
}
