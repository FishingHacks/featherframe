export function getFuncName(func) {
  return func.name ? func.name : null;
}

function waitForLoad() {
  return new Promise((r) =>
    document?.body ? r() : window.addEventListener("DOMContentLoaded", r)
  );
}

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

if (!window.featherframeConfig)
  window.featherframeConfig = { logEvents: false, devtools: false };

const logEvents = featherframeConfig?.logEvents || false;
const devtools = featherframeConfig?.devtools || false;

export class VNode {
  #children = [];
  #attrs = {};
  events = {};
  tag = "";
  #name = "anonymous";

  constructor(tag, attrs = { events: {} }, ...childs) {
    let children = childs || [];
    attrs = attrs || { events: {} };
    children = children[0] instanceof Array ? children[0] : [children[0]];
    this.#name = typeof tag == "string" ? tag : getFuncName(tag);

    if (!attrs.events) {
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

  getDevtoolsObject() {
    return {
      title: `<${this.#name} />`,
      value: [
        {
          title: "children",
          value: this.#children.map((el) =>
            el instanceof VNode ? el.getDevtoolsObject() : el.toString()
          ),
        },
        {
          title: "attributes",
          value: this.attributes,
        },
        {
          title: "events",
          value: this.events,
        },
      ],
    };
  }

  async render(xmlns = "") {
    if (logEvents) console.log("rendering VNode", this);
    try {
      if (typeof this.tag == "function")
        return await this.tag(this.#attrs, this.#children);
      else {
        const attrKeys = Object.keys(this.#attrs);
        for (const i in attrKeys) {
          const attr = attrKeys[i];
          if (this.#attrs[attr] === false) delete this.#attrs[attr];
          else if (this.#attrs[attr] === true) this.#attrs[attr] = "";
        }
      }

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
        if (key != null && key != undefined && key != "" && key != "xmlns")
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

      const childs = [...this.#children].reverse();
      while (childs.length > 0) {
        const el = childs.pop();

        if (el !== null && el !== undefined) {
          let n = null;

          if (el instanceof VNode) n = await el.render(xmlns);
          else if (typeof el == "object") {
            try {
              n = document.createTextNode(JSON.stringify(el));
            } catch (e) {
              n = document.createElement("p");
              n.style.color = "red";
              n.textContent = e.stack;
            }
          } else if (typeof el == "symbol") n = document.createTextNode(el.description);
          else n = document.createTextNode(el.toString());

          if (n instanceof Array) {
            n = expandArray(n);
            n.reverse();
            childs.push(...n);
          } else if (n === null || n === undefined) {/* Do nothing */}
          else if (n instanceof VNode) childs.push(n);
          else element.append(n);
        }
      }

      if (typeof element.getAttribute("ref") == "string") {
        this.#attrs.ref ? (this.#attrs.ref.current = element) : null;
        element.removeAttribute("ref");
      }
      return element;
    } catch (e) {
      if (e.message.substr(0, 30) == "Error whilst trying to render ") throw e; // to prevent smth like 'Error whilst trying to render Checkbox: Error whilst trying to render App: a is not defined'
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

  get name() {
    return this.#name;
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

  get children() {
    return this.#children;
  }

  async render() {
    if (rendering)
      return logEvents && console.error("Render called during render");
    rendering = true;
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 10)); // <- wait a bit in case multiple rerenders get caused by setting of states iex.
    if (logEvents) console.log("rendering...");
    i = 0;
    ieffect = 0;
    iref = 0;
    imemo = 0;

    try {
      let childs = await this.#children(this.#state);
      childs = expandArray(childs);
      currentChildren = [...childs];
      let error = false;
      const children_to_append = [];
      while (childs.length > 0) {
        try {
          const el = childs.pop();
          let n = null;

          if (el === null || el === undefined) {/* Do nothing */}
          else if (el instanceof VNode) n = await el.render();
          else if (typeof el == "object") {
            try {
              n = document.createTextNode(JSON.stringify(el));
            } catch (e) {
              n = document.createElement("p");
              n.style.color = "red";
              n.textContent = e.stack;
            }
          } else n = document.createTextNode(el.toString());
          if (n instanceof Array) {
            n = expandArray(n);
            n.reverse();
          childs.push(...n);
          } else if (n instanceof VNode) childs.push(n);
          else if(n===undefined || n === null) {/* Do nothing */}
          else children_to_append.push(n);
        } catch (e) {
          error = e;
        }
      }

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
    rendering = false;
    if (devtools) window.featherframe.displayDT();
    if (devtools) {
      let div = document.getElementById("FeatherFrameDevTools");
      if (!div) {
        const ffdt = document.createElement("div");
        ffdt.id = "FeatherFrameDevTools";
        document.body.append(ffdt);
      }
      div = document.getElementById("FeatherFrameDevTools");
      if (div.getElementsByClassName("details").length) {
        Object.values(div.getElementsByClassName("details")).forEach((el) =>
          div.removeChild(el)
        );
      }
    }
    if (logEvents) console.log(`Rendered VDom in ${Date.now() - startTime}ms`);
    if (rerendering) rerender()
    rerendering = false;
  }
}

let rerendering = false;
let rendering = false;

let vdom;

export function rerender() {
  vdom?.render?.();
}

function waitFor() {
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
  function setState(val, suppressRender = false) {
    if (typeof val == "function") val = val(states[index]);
    states[index] = val;
    if (!rendering && !suppressRender) rerender();
    else if (rendering) rerendering = true;
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
    if (!rendering) rerender();
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
    const newState = reducer(state, action);
    if (newState == state) return;
    else if (typeof newState == "object" && typeof state == "object") {
      const nsK = Object.keys(newState);
      const nsV = Object.values(newState);
      const sK = Object.keys(state);
      const sV = Object.keys(state);
      if (sK.length != nsK.length) return setState(newState);
      if (sV.length != nsV.length) return setState(newState);
      if (
        nsK.map((el, i) => el == sK[i]).includes(false) ||
        nsV.map((el, i) => el == sV[i]).includes(false)
      )
        return setState(newState);
      return;
    }
    return setState(newState);
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

export function reset() {
  // if (logEvents) console.log("resetting...");
  // i = 0;
  // idstates = {};
  // ieffect = 0;
  // iref = 0;
  // effects = [];
  // states = [];
}

let currentChildren = [];

window.featherframe = {};

let RootIsActive = true;

function toggleRoot() {
  try {
    RootIsActive = !RootIsActive;
    window.featherframe.displayDT();
  } catch (e) {
    console.error(e);
  }
}
function triggerState(uuid) {
  try {
    DevToolsState[uuid] = !DevToolsState[uuid];
    window.featherframe.displayDT();
  } catch (e) {
    console.error(e);
  }
  logInfosofVNode(getVNodeFromUUID(uuid));
}

window.FDTtoggleRoot = toggleRoot;
window.FDTtriggerState = triggerState;

let DevToolsState = {};

window.featherframe.displayDT = function () {
  const a_el = document.createElement("a");
  a_el.href = "javascript:FDTtoggleRoot()";
  a_el.innerHTML = `${RootIsActive ? "▼&nbsp;" : "▶&nbsp;"}Root`;
  if (RootIsActive)
    display(transform(), DevToolsState, "&nbsp;&nbsp;").forEach((el) =>
      a_el.append(el)
    );
  a_el.style.color = "black";
  a_el.style.textDecoration = "none";
  a_el.style.display = "block";
  let div = document.getElementById("FeatherFrameDevTools");
  if (!div) {
    const ffdt = document.createElement("div");
    ffdt.id = "FeatherFrameDevTools";
    document.body.append(ffdt);
  }
  div = document.getElementById("FeatherFrameDevTools");
  Object.values(div.children).forEach((el) => div.removeChild(el));
  div.append(a_el);
  return a_el;
};

function transform(childs, parents = "1") {
  if (!childs) childs = currentChildren;

  const nc = {};

  childs.forEach((el, i) => {
    el instanceof VNode
      ? (nc[i + "-" + parents + ":" + el.name] = transform(
          el.children,
          i + "-" + parents
        ))
      : [];
  });

  return Object.keys(nc).length == 0 ? null : nc;
}

function display(transformed, state, pref) {
  const elements = [];
  const keys = Object.keys(transformed);
  const values = Object.values(transformed);
  keys
    .map((el) => {
      let name = el.split(":");
      const uuid = name.shift();
      name = name.join(":");
      return { name, uuid };
    })
    .forEach((el, i) => {
      const { name, uuid } = el;
      if (state[uuid] != true && state[uuid] != false) state[uuid] = false;
      let a = document.createElement("a");
      a.innerHTML = `${pref}${
        values[i] != null && values[i] != undefined
          ? state[uuid]
            ? "▼&nbsp;"
            : "▶&nbsp;"
          : ""
      }${name
        .replaceAll("&", "&amp;")
        .replaceAll(" ", "&nbsp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")}`;
      a.style.color = "black";
      a.style.textDecoration = "none";
      if (values[i] != null && values[i] != undefined)
        a.href =
          "javascript:FDTtriggerState('" + uuid.replaceAll("'", "\\'") + "')";
      else
        a.href =
          "javascript:FDTInfos(FDTGetVNode('" +
          uuid.replaceAll("'", "\\'") +
          "'))";
      if (state[uuid] && values[i] != null && values[i] != undefined) {
        display(values[i], state, pref + "&nbsp;&nbsp;").forEach((child) =>
          a.append(child)
        );
      }
      elements.push(document.createElement("br"));
      elements.push(a);
    });
  return elements;
}

window.featherframe.transform = transform;

function getChilds(childs, pref) {
  let str = "";
  childs.forEach((el) => {
    let childRep =
      el instanceof VNode ? getChilds(el.children, pref + "  ") : "";
    el instanceof VNode
      ? (str += `\n${pref}${childRep != "" ? "▼ " : ""}${
          el.name //.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll(" ", "&nbsp;")
        }${childRep}`)
      : null;
  });
  return str;
}

const memos = [];
let imemo = 0;

export function useMemo(func, deps) {
  if (typeof func != "function") return undefined;
  const index = imemo;
  imemo++;
  if (memos[index] == undefined)
    memos[index] = {
      value: func(),
      lastdeps: deps,
    };
  else {
    let is_eq = true;
    if (memos[index].lastdeps instanceof Array) {
      const lastdeps = memos[index].lastdeps;
      for (const i in lastdeps) lastdeps[i] == deps[i] ? null : (is_eq = false);
    } else is_eq = deps == memos[index].lastdeps;

    if (!is_eq)
      memos[index] = {
        value: func(),
        lastdeps: deps,
      };
  }

  return memos[index].value;
}

export function useFetch(url, parameters) {
  const [data, setData] = useState({
    url,
    parameters,
    loading: false,
    data: null,
    valid: false,
    error: false,
    request: null,
  });

  if (
    !data.valid ||
    data.url != url ||
    parameters?.method != data?.parameters?.method
  ) {
    data.loading = true;
    data.error = null;
    if (!data?.parameters?.keep) data.data = null;
    data.request = fetch(data.url, data.parameters).then(async (response) => {
      if (!response.ok)
        return setData((data) => ({
          ...data,
          data: null,
          error: true,
          loading: false,
          request: null,
        }));
      let data = await response.text();
      if (
        (data.startsWith("{") && data.endsWith("}")) ||
        (data.startsWith("[") && data.endsWith("]"))
      )
        try {
          data = JSON.parse(data);
        } catch {}
      setData((oldData) => ({
        ...oldData,
        request: null,
        error: false,
        loading: false,
        data,
      }));
    });
  }

  data.valid = true;
  data.url = url ? url : data.url;
  data.parameters = parameters ? parameters : data.parameters;

  setData(data);

  function change(url, parameters) {
    setData((data) => {
      const newData = { ...data };
      newData.url = url ? url : newData.url;
      newData.parameters = parameters ? parameters : newData.parameters;
      return newData;
    });
  }

  function invalidate() {
    setData((data) => ({ ...data, valid: false }));
  }

  return {
    data: data.data,
    loading: data.loading,
    invalidate,
    change,
    refetch: invalidate,
    error: data.error,
    request: data.request,
  };
}

function traverse(p, arr) {
  if (arr.length < 1) return p;
  let val = arr.shift();
  return traverse(p.children[val], arr);
}

function getVNodeFromUUID(uuid) {
  uuid = uuid
    .substring(0, uuid.length - 2)
    .split("-")
    .reverse();
  return traverse(currentChildren[uuid.shift()], uuid);
}

window.FDTGetVNode = getVNodeFromUUID;

function logInfosofVNode(vnode) {
  if (!vnode instanceof VNode)
    return console.error("supposedly vnode", vnode, "is not of type VNode");
  let textContent = vnode.children
    .map((el) =>
      el instanceof VNode ? "" : "\n" + el.toString().replaceAll(" ", "&nbsp;")
    )
    .join("")
    .substring(1)
    .replaceAll(/^ +/g, "")
    .replaceAll(/ +$/g, "")
    .replaceAll("&nbsp;", " ");
  let attributes = vnode.attributes;
  let events = vnode.events;

  const div = document.getElementById("FeatherFrameDevTools");
  const events_el = document.createElement("p");
  events_el.textContent = "Registered Events:";
  const attributes_el = document.createElement("p");
  attributes_el.textContent = "Attributes:";
  const attrKeys = Object.keys(attributes);
  const evKeys = Object.keys(events);
  attrKeys.forEach((el) => {
    if (el == "events") return;
    attributes_el.append(document.createElement("br"));
    let str = el;
    const attr = attributes[el];
    if (typeof attr == "string") str += attr.length ? "=" + safe(attr) : "";
    else if (typeof attr == "number") str += "=" + attr;
    else if (typeof attr == "bigint") str += "=" + attr;
    else if (typeof attr == "symbol") str += "=" + attr;
    else if (typeof attr == "boolean") str += "=" + attr ? "true" : "false";
    else if (typeof attr == "function") str += "=fn " + getFuncName(attr);
    else str += JSON.stringify(attr);
    attributes_el.append(document.createTextNode(str));
  });

  evKeys.forEach((el) => {
    events_el.append(document.createElement("br"));
    let str = el;
    const attr = events[el];
    if (typeof attr == "string") str += attr.length ? ": " + safe(attr) : "";
    else if (typeof attr == "number") str += ": " + safe(attr);
    else if (typeof attr == "bigint") str += ": " + safe(attr);
    else if (typeof attr == "symbol") str += ": " + safe(attr);
    else if (typeof attr == "boolean") str += ": " + attr ? "true" : "false";
    else if (typeof attr == "function")
      str +=
        ': <span id="FFDTFN">fn </span>' +
        safe(getFuncName(attr) == null ? "anonymous" : getFuncName(attr)) +
        " <a href=\"javascript:console.log('" +
        safejs(attr.toString()) +
        "')\">(log fn)</a>";
    else str += JSON.stringify(attr);
    events_el.innerHTML += "\n" + str;
  });

  const nodes = [];
  if (textContent.length) {
    // we abuse that !!0 === false
    const textContent_el = document.createElement("p");
    textContent_el.textContent = "Content: " + textContent;
    nodes.push(textContent_el);
  }
  if (events_el.children.length) nodes.push(events_el);
  if (attributes_el.children.length) nodes.push(attributes_el);
  appendInfo(div, ...nodes);
}

function safe(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(" ", "&nbsp;")
    .replaceAll("'", "&#39;");
}

function safejs(str) {
  return str
    .replaceAll("&", "\\&amp;")
    .replaceAll("<", "\\&lt;")
    .replaceAll(">", "\\&gt;")
    .replaceAll('"', "\\&quot;")
    .replaceAll("'", "\\&#39;")
    .replaceAll("\n", "\\n");
}

function appendInfo(div, ...node) {
  if (!node.length) return;
  if (div.getElementsByClassName("details").length) {
    Object.values(div.getElementsByClassName("details")).forEach((el) =>
      div.removeChild(el)
    );
  }
  const dd = document.createElement("div");
  dd.style.display = "block";
  dd.style.borderLeft = "3px black solid";
  dd.classList.add("details");
  dd.append(...node);
  div.append(dd);
}

window.FDTInfos = logInfosofVNode;
