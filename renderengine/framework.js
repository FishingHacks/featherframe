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
  require,
  loadModules,
} from "./engine";
import htm from "https://unpkg.com/htm?module";
import { reset, h, render as r, rerender } from "./engine";
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

const loadedSites = {};

export async function App() {
  try {
    let app = { render: () => [] };
    if (!!loadedSites[location.pathname]) app = loadedSites[location.pathname];
    else {
      app = await import(
        location.origin +
          "/pages" +
          (location.pathname == "/" ? "/index" : location.pathname) +
          ".js"
      );
    }
    loadedSites[location.pathname] = app;
    if (app.render && typeof app.render == "function") {
      try {
        return await app.render();
      } catch (e) {
        console.error("Error while rendering the app", e);
        return [];
      }
    } else return [];
  } catch {
    return [];
  }
}

window.addEventListener("click", (e) => {
  e.preventDefault();
  if (!e.target.href) return;
  if (e.target.target == "_blank") return;
  if (e.ctrlKey) return;
  try {
    const url = new URL(e.target.href);
    if (url.origin != location.origin) return;
  } catch {}
  let uri = undefined;
  try {
    uri = new URL(e.target.href);
  } catch {
    return;
  }
  console.log("SPA Action", uri.href);
  e.preventDefault();
  history.pushState(uri.href, uri.href, uri.href);
  reset();
  rerender();
});

window.addEventListener("popstate", () => {
  reset();
  rerender();
});
