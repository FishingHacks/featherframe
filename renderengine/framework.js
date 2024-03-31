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
    isValidVNode,
    useMemo,
    useFetch,
    useContext,
} from './engine';
import htm from 'https://unpkg.com/htm?module';
import {
    isValidVNode,
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
    getFuncName,
    useFetch,
    useReducer,
    useMemo,
    createContext,
    useContext,
} from './engine';

/**
 *
 * @param {keyof Console} weight
 * @param {string} text
 * @param {any[]} args
 */
function log(weight, text, ...args) {
    console[weight](
        '%c[featherframe/framework]%c ' + text,
        'color: #d946ef; font-weight: bold',
        'all: reset',
        ...args
    );
}

export function requireCSS(src) {
    let link = document.createElement('link');
    link.href = src;
    link.rel = 'stylesheet';
    document.head.append(link);
}
export function render(children = () => [], mnt = document.body) {
    return r(children, mnt);
}
export function requireScript(src, isModule = false) {
    let script = document.createElement('script');
    script.src = src;
    if (isModule) script.type = 'module';
    document.head.append(script);
}
export const html = htm.bind(h);
export function matchpath(path, pathname) {
    let spath = path.split('/');
    spath = spath.map((el) => (el.startsWith(':') ? '(.+)' : el));
    if (new RegExp(spath.join('/')).exec(pathname) != null) {
        let ret1 = new RegExp(spath.join('/')).exec(pathname);
        ret1.shift();
        let ids = Object.keys(ret1);
        let ret2 = [];
        Object.values(ret1).forEach((el, i) => {
            !isNaN(Number(ids[i])) ? ret2.push(el) : null;
        });
        let ret = {};
        spath = path.split('/');
        spath.forEach((el) =>
            el.startsWith(':') ? (ret[el.substr(1)] = ret2.shift()) : null
        );
        return ret;
    } else {
        throw new Error('path cant mach pathname :<');
    }
}

const BACKEND_PGS = [];
const FRONTEND_PGS = [];

fetch(location.origin + '/__featherframe/bckndpgs')
    .then((data) => data.json())
    .then((arr) =>
        arr instanceof Array ? arr.forEach((el) => BACKEND_PGS.push(el)) : null
    );

const loadedSites = {};

export async function App({ path }) {
    if (!path || typeof path != 'string') path = window.location.pathname;
    if (FRONTEND_PGS.length < 1)
        await fetch(location.origin + '/__featherframe/frndpgs')
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
        if (!!loadedSites[path]) app = loadedSites[path];
        else {
            let importPath = location.origin + '/pages/';
            for (const i in FRONTEND_PGS) {
                if (!isNaN(Number(i))) {
                    const el = FRONTEND_PGS[i];
                    if (path.endsWith('/') && path.length > 1) {
                        path = path.substring(0, path.length - 1);
                    }
                    if (
                        new RegExp('^' + el.regex + '$').exec(path)?.join('') ==
                        path
                    ) {
                        importPath += el.path + '.js';
                        break;
                    }
                }
            }
            importPath = importPath.replaceAll(/\/+/g, '/');
            app = await import(importPath);
        }
        loadedSites[path] = app;
        if (app.render && typeof app.render == 'function') {
            try {
                return await app.render();
            } catch (e) {
                log('error', 'Error while rendering the app: %s', e);
                return [];
            }
        } else return html`<p>Site exports no render function</p>`;
    } catch (e) {
        log('error', 'An error occurred: %s', e);
        return html`<p>An Error occured: ${e.toString()}</p>`;
    }
}

window.addEventListener('click', (e) => {
    if (!e.target.href && !e.target.getAttribute('href')) return false;
    if (
        e.target.target == '_blank' ||
        e.target.getAttribute('target') === '_blank'
    )
        return false;
    if (e.ctrlKey) return false;
    let tHref = e.target.href ? e.target.href : e.target.getAttribute('href');
    if (!tHref) return false;
    try {
        new URL(tHref);
    } catch {
        tHref = (
            tHref.startsWith('/')
                ? window.location.origin + tHref
                : window.location.pathname + tHref
        ).replaceAll(/\/+/g, '/');
    }
    try {
        const url = new URL(tHref);
        if (url.origin != location.origin) return false;
        if (
            BACKEND_PGS.map(
                (el) =>
                    new RegExp(el).exec(url.pathname)?.join('') == url.pathname
            ).includes(true)
        )
            return false;
    } catch (e) {
        log('error', 'An error in the click handler occurred: %s', e);
    }
    let uri = undefined;
    try {
        uri = new URL(tHref);
    } catch {
        return false;
    }
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
        history.pushState(uri.href, uri.href, uri.href);
        reset();
        rerender();
        return uri.href;
    } catch (e) {
        return false;
    }
}

window.addEventListener('popstate', () => {
    reset();
    rerender();
});

function errorPromise(err) {
    return new Promise((res, rej) => rej(err));
}

const frameworkObject = {
    isValidVNode,
    h,
    rerender,
    useState,
    useIDState,
    setTitle,
    getFuncName,
    getTitle,
    useEffect,
    useRef,
    useReducer,
    loadModules,
    createContext,
    useMemo,
    useContext,
    matchesPathExact,
    RouterLink,
    App,
    html: htm.bind(h),
    render,
    requireCSS,
    requireScript,
    matchpath,
    redirect,
    useFetch,
    goto: (pathname) => {
        redirect(new URL(location.origin + pathname));
    },
};

export function goto(pathname) {
    redirect(new URL(location.origin + pathname));
}

const loadedModules = {
    framework: frameworkObject,
    featherframe: frameworkObject,
};

export function loadModule(modulepath, modulename) {
    if (loadedModules[modulename]) return new Promise((r) => r());
    if (typeof modulepath != 'string')
        return errorPromise(
            '[ERR] module path ' + modulepath + ' is not a string'
        );
    if (typeof modulename != 'string')
        return errorPromise(
            '[ERR] module name ' + modulename + ' is not a string'
        );
    if (!modulepath.startsWith('/')) modulepath = '/' + modulepath;

    return new Promise((r) => {
        import(modulepath).then((exportedValues) => {
            loadedModules[modulename] = exportedValues;
            r();
        });
    });
}

export function loadModules(modules = []) {
    let promises = modules.map((el) => loadModule(...el));
    return new Promise((res) => {
        let unresolved = promises.length;
        promises.forEach((el, i) => {
            el.then((empty) => {
                unresolved--;
                if (unresolved < 1) res();
            }).catch((err) => {
                log(
                    'error',
                    'Error while loading module %s: %s',
                    modules[i],
                    err
                );
                unresolved--;
                if (unresolved < 1) res();
            });
        });
    });
}

export function require(module) {
    if (!loadedModules[module])
        throw new Error('[ERR] module ' + module + " wasn't yet loaded");
    return loadedModules[module];
}

Object.defineProperty(window, 'require', {
    value: require,
    writable: false,
});

export function matchesPathExact(path, pathname = window.location.pathname) {
    for (const i in FRONTEND_PGS) {
        if (!isNaN(Number(i))) {
            const el = FRONTEND_PGS[i];
            if (
                new RegExp('^' + el.regex + '$').exec(pathname)?.join('') ==
                path
            ) {
                return true;
            }
        }
    }
    return false;
}

export async function RouterLink(
    { path, tag, class: cls, href, ...other },
    children
) {
    if (FRONTEND_PGS.length < 1)
        await fetch(location.origin + '/__featherframe/frndpgs')
            .then((data) => data.json())
            .then((arr) =>
                arr instanceof Array
                    ? arr.forEach((el) =>
                          el.regex && el.path ? FRONTEND_PGS.push(el) : null
                      )
                    : null
            );
    if (!href || typeof href != 'string') href = false;
    if (!path || typeof path != 'string') path = '';
    if (!cls || typeof cls != 'string') cls = '';
    return h(
        tag == '' || typeof tag != 'string' ? 'a' : tag,
        {
            ...other,
            href,
            class:
                cls +
                (matchesPathExact(href, window.location.pathname)
                    ? cls == ''
                        ? 'pathMatchesExact'
                        : ' pathMatchesExact'
                    : ''),
        },
        children
    );
}
