const logEvents = feahterframeConfig.logEvents || false;

export {
  h,
  rerender,
  useState,
  useIDState,
  setTitle,
  getTitle,
  useEffect,
  useRef,
  useReducer,
  createContext,
  useContext,
} from "./engine";
import htm from "https://unpkg.com/htm?module";
import {
  reset,
  h,
  render as r,
  rerender,
  useState,
  useIDState,
  setTitle,
  getTitle,
  useEffect,
  useRef,
  useReducer,
  createContext,
  useContext,
} from "./engine";
export function requireCSS(src) {
  let link = document.createElement("link");
  link.href = src;
  link.rel = "stylesheet";
  document.head.append(link);
}
export function render(children = () => [], mnt = document.body) {
  return r({
    mnt,
    children,
  });
}
export function requireScript(src, isModule = false) {
  let script = document.createElement("script");
  script.src = src;
  if (isModule) script.type = "module";
  document.head.append(script);
}
export const html = htm.bind(h);
export function matchpath(path, pathname) {
  let spath = path.split("/");
  spath = spath.map((el) => (el.startsWith(":") ? "(.+)" : el));
  if (new RegExp(spath.join("/")).exec(pathname) != null) {
    let ret1 = new RegExp(spath.join("/")).exec(pathname);
    ret1.shift();
    let ids = Object.keys(ret1);
    let ret2 = [];
    Object.values(ret1).forEach((el, i) => {
      !isNaN(Number(ids[i])) ? ret2.push(el) : null;
    });
    let ret = {};
    spath = path.split("/");
    spath.forEach((el) =>
      el.startsWith(":") ? (ret[el.substr(1)] = ret2.shift()) : null
    );
    return ret;
  } else {
    throw new Error("path cant mach pathname :<");
  }
}

const BACKEND_PGS = [];
const FRONTEND_PGS = [];

fetch(location.origin + "/__featherframe/bckndpgs")
  .then((data) => data.json())
  .then((arr) =>
    arr instanceof Array ? arr.forEach((el) => BACKEND_PGS.push(el)) : null
  );

const loadedSites = {};

export async function App() {
  if (FRONTEND_PGS.length < 1)
    await fetch(location.origin + "/__featherframe/frndpgs")
      .then((data) => data.json())
      .then((arr) =>
        arr instanceof Array
          ? arr.forEach((el) =>
              el.regex && el.path ? FRONTEND_PGS.push(el) : null
            )
          : null
      );
  try {
    let app = { render: () => [] };
    if (!!loadedSites[location.pathname]) app = loadedSites[location.pathname];
    else {
      let importPath = location.origin + "/pages/";
      for (const i in FRONTEND_PGS) {
        if (!isNaN(Number(i))) {
          const el = FRONTEND_PGS[i];
          if (
            new RegExp(el.regex).exec(location.pathname)?.join("") ==
            location.pathname
          ) {
            importPath += el.path + ".js";
            break;
          }
        }
      }
      importPath = importPath.replaceAll(/\/+/g, "/");
      app = await import(importPath);
    }
    loadedSites[location.pathname] = app;
    if (app.render && typeof app.render == "function") {
      try {
        return await app.render();
      } catch (e) {
        console.error("Error while rendering the app", e);
        return [];
      }
    } else return html`Site exports no render function`;
  } catch (e) {
    console.log(e);
    return html`<p>An Error occured: ${e.toString()}</p>`;
  }
}

window.addEventListener("click", (e) => {
  if (!e.target.href) return false;
  if (e.target.target == "_blank") return false;
  if (e.ctrlKey) return false;
  try {
    const url = new URL(e.target.href);
    if (url.origin != location.origin) return false;
    if (
      BACKEND_PGS.map(
        (el) => new RegExp(el).exec(url.pathname)?.join("") == url.pathname
      ).includes(true)
    )
      return false;
  } catch (e) {
    console.error(e);
  }
  let uri = undefined;
  try {
    uri = new URL(e.target.href);
  } catch {
    return false;
  }
  console.log("SPA Action", uri.href);
  e.preventDefault();

  history.pushState(uri.href, uri.href, uri.href);
  reset();
  rerender();
});

export function redirect(url) {
  try {
    let uri = new URL(url);
    if (window.location.origin != uri.origin)
      return (window.location.href = uri.href);
    console.log("SPA Action", uri.href);
    history.pushState(uri.href, uri.href, uri.href);
    reset();
    rerender();
    return uri.href;
  } catch (e) {
    return false;
  }
}

window.addEventListener("popstate", () => {
  reset();
  rerender();
});

function errorPromise(err) {
  return new Promise((res, rej) => rej(err));
}

const frameworkObject = {
  h,
  rerender,
  useState,
  useIDState,
  setTitle,
  getTitle,
  useEffect,
  useRef,
  useReducer,
  createContext,
  useContext,
  App,
  html: htm.bind(h),
  render,
  requireCSS,
  requireScript,
  matchpath,
  redirect,
  goto: (pathname) => {
    redirect(new URL(location.origin + pathname));
  },
};

export function goto(pathname) {
  redirect(new URL(location.origin + pathname));
}

const loadedModules = {
  framework: frameworkObject,
  featherframe: frameworkObject
};

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

Object.defineProperty(window, "require", {
  value: require,
  writable: false,
});
