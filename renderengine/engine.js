import htm from "https://unpkg.com/htm?module";


// ┌────────────────┐
// │                │
// │    MOUNTING    │
// │                │
// └────────────────┘
function mount($node, $target) {
    $target.replaceWith($node);
    return $node;
}

// ┌───────────────┐
// │               │
// │    Diffing    │
// │               │
// └───────────────┘
/**
 * Diff algorithm by ycmjason
 * Repository: https://github.com/ycmjason-talks/2018-11-21-manc-web-meetup-4
 * File: https://github.com/ycmjason-talks/2018-11-21-manc-web-meetup-4/blob/master/src/vdom/diff.js
 */

const zip = (xs, ys) => {
    const zipped = [];
    for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
        zipped.push([xs[i], ys[i]]);
    }
    return zipped;
};

const diffAttrs = async (oldAttrs, newAttrs) => {
    const patches = [];

    // set new attributes
    for (const [k, v] of Object.entries(newAttrs)) {
        patches.push($node => {
            if (k === "ref") v.current = $node;
            else $node.setAttribute(k, v);
            return $node;
        });
    }

    // remove old attributes
    for (const k in oldAttrs) {
        if (!(k in newAttrs)) {
            patches.push($node => {
                $node.removeAttribute(k);
                return $node;
            });
        }
    }

    return async $node => {
        for (const patch of patches) {
            await patch($node);
        }
    };
};

const diffChildren = async (oldVChildren, newVChildren) => {
    const childPatches = [];
    for (const i in oldVChildren) childPatches.push(await diff(oldVChildren[i], newVChildren[i]));

    const additionalPatches = [];
    for (const additionalVChild of newVChildren.slice(oldVChildren.length)) {
        additionalPatches.push(async $node => {
            $node.appendChild(await renderElement(additionalVChild));
            return $node;
        });
    }

    return async $parent => {
        for (const [patch, child] of zip(childPatches, $parent.childNodes)) {
            if (!patch) $parent.removeChild(child);
            else await patch(child);
        }

        for (const patch of additionalPatches) {
            await patch($parent);
        }

        return $parent;
    };
};

export const diff = async (vOldNode, vNewNode) => {
    if (vNewNode === undefined) {
        return async $node => {
            $node.remove();
            return undefined;
        };
    }

    if (typeof vOldNode === 'string' ||
        typeof vNewNode === 'string') {
        if (vOldNode !== vNewNode) {
            return async $node => {
                const $newNode = await renderElement(vNewNode);
                $node.replaceWith($newNode);
                return $newNode;
            };
        } else {
            return $node => undefined;
        }
    }

    if (vOldNode.tagName !== vNewNode.tagName) {
        return async $node => {
            const $newNode = await renderElement(vNewNode);
            $node.replaceWith($newNode);
            return $newNode;
        };
    }
    const patchAttrs = await diffAttrs(vOldNode.attrs, vNewNode.attrs);
    const patchChildren = await diffChildren(vOldNode.children, vNewNode.children);

    return async $node => {
        $node.__ffuuid__ = vNewNode.uuid;
        await patchAttrs($node);
        await patchChildren($node);
        return $node;
    };
};

// ┌──────────────────┐
// │                  │
// │    VDOM stuff    │
// │                  │
// └──────────────────┘

// export function flatArray(arr) {
//     if (!(arr instanceof Array)) return [arr];
//     let _arr = [...arr];
//     arr = [];
//     while (containsType(_arr, Array)) {
//         for (const item of _arr) {
//             if (item instanceof Array) arr.push(...item);
//             else arr.push(item);
//         }
//         _arr = [...arr];
//         arr = [];
//     }
//     return _arr;
// }

function flatArray(childs) {
    // make sure that flatArray changes at no time values in the original array, as it might be used later in execution
    childs = childs instanceof Array ? [...childs] : [childs];

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

function getListener(name) {
    function listener(e, ...args) {
        try {
            if (!e?.path) return console.error(e, "doesn't contain a path property, which is necessary in order to execute the event handler correctly");
            const node = e.path[0];
            if (!node) return console.error(node, "is not existent. Does the event contain a valid path attribute?", e);
            const UUID = node.__ffuuid__;
            if (!UUID) return console.error("Something went wrong during rendering. Event handler", name, "can't be executed");
            const vNode = getElementByUUID(UUID);
            if (!vNode) return console.error("Internal UUID is not up-to-date. An rerender should fix this");
            if (!vNode.events[name]) return; // do nothing if the handler does not exist, as we don't clear unused handlers
            const handler = vNode.events[name];
            if (typeof handler !== "function") return console.error("Handler", handler, "is not a function");
            const _retValue = handler();
            if (_retValue instanceof Promise) _retValue.catch(console.error).then(() => { });
            else return _retValue;
        }
        catch (e) {
            // Remove this function from the stacktrace
            let stackArray = e.stack?.split("\n");
            stackArray?.pop?.();
            const stacktrace = stackArray?.join?.("\n");

            console.error("Uncaught" + (stacktrace || e.name || "Error"));
        }
    }

    return listener;
}

export function h(tagName, attrs = {}, ...children) {
    if (typeof attrs != "object" || attrs === null) attrs = {};
    if (!tagName || !["string", "function"].includes(typeof tagName)) throw new Error(tagName.toString() + " can't be a tag");
    const attributes = {};
    const events = {};
    for (const [k, v] of Object.entries(attrs)) {
        if (k.startsWith("on") && typeof v === "function" && typeof tagName !== "function" && k.length > 2) events[k.substring(2)] = v;
        else attributes[k] = v;
    }
    return {
        uuid: crypto.randomUUID(),
        tagName,
        attrs: attributes,
        children,
        events
    }
}

export async function renderElement(vEl, xmlns = "") {
    if (!vEl.tagName || !vEl.attrs || !vEl.children) return document.createTextNode(typeof vEl === "symbol" ? vEl.description : (typeof vEl === "string" || typeof vEl === "bigint" || typeof vEl === "function") ? vEl.toString() : JSON.stringify(vEl)); // If the virtual Element does not contain all required attributes, return:
    // - The description if the element is a symbol (Symbol("abc").description === "abc" = true)
    // - if the vEl is a string, function or bigint, return the return value of .toString() (bigint can't be serialized and function serialization fails for some reason...)
    // - otherwise return the serialized value of the type (JSON.stringify())
    if (typeof vEl.tagName === "function") { // Functional Components
        return await vEl.tagName(vEl.attrs, vEl.children)
    }

    
    if (typeof vEl.attrs?.xmlns === "string") xmlns = vEl.attrs.xmlns;
    
    
    const $el = (xmlns
        ? document.createElementNS(xmlns, vEl.tagName)
        : document.createElement(vEl.tagName)); // create a HTML Element corresponding to the type

    for (const [k, v] of Object.entries(vEl.attrs)) {
        if (k === "ref") v.current = $el;
        else $el.setAttribute(k, v);
    }
    for (const [name, listener] of Object.entries(vEl.events)) {
        $el.addEventListener(name, getListener(name));
    }

    $el.__ffuuid__ = vEl.uuid;

    const vChilds = flatArray(vEl.children);
    while (vChilds.length > 0) {
        const vChild = vChilds.shift();
        const $child = (vChild ? await renderElement(vChild, xmlns) : null);
        await new Promise(r => setTimeout(r, 10));
        if ($child instanceof Element || $child instanceof Text) $el.append($child);
        else if($child instanceof Array) {
            vChilds.unshift(...flatArray($child));
        }
    }

    return $el; // return the dom node
}

let currentVDom = undefined;
let root = undefined;
let child = undefined;

export function getVDom() {
    if (!currentVDom || !exist(currentVDom) || !child || !exist(child)) return null;
    return currentVDom;
}

export function getElementByUUID(uuid) {
    if (!currentVDom || currentVDom === undefined || currentVDom === null) return null;
    return __getElementByUUID(uuid, currentVDom);
}

function __getElementByUUID(uuid, elements) {
    if (!uuid || uuid === undefined || uuid === null || !uuid.toString) return null;
    uuid = uuid.toString();
    elements = flatArray(elements);
    for (const vNode of elements) {
        if (typeof vNode === "object") {
            if (vNode.uuid === uuid) return vNode;
            const res = (vNode.children && vNode.children !== undefined) ? __getElementByUUID(uuid, vNode.children) : null;
            if (res !== null && res != undefined && typeof res === "object") return res;
        }
    }
    return null;
}

function awaitLoad() {
    return new Promise(r => {
        if (document.body instanceof HTMLElement) return r();
        addEventListener("load", r);
    })
}

export async function render(_child, app = document.body) {
    if (rendering) return;
    rendering = true;
    await new Promise(r => setTimeout(r, 30));
    await awaitLoad();
    currentVDom = await _child();
    if (currentVDom instanceof Array) currentVDom = h("div", { ffautocreate: "root" }, ...flatArray(currentVDom));
    currentVDom = await transform(currentVDom);
    if (currentVDom instanceof Array) currentVDom = h("div", { ffautocreate: "root" }, ...flatArray(currentVDom));
    currentVDom.children = flatArray(currentVDom.children)
    child = _child;
    root = await renderElement(currentVDom);
    mount(root, app);

    await executeEffects(); 

    console.log(currentVDom)

    rendering = false;
    return root;
}

let rendering = false;

export async function rerender() {
    if (rendering) return;
    rendering = true;
    await new Promise(r => setTimeout(r, 30));
    await onRerender();
    try {
        let untransformedDOM = await child();
        if (untransformedDOM instanceof Array) untransformedDOM = h("div", { ffautocreate: "root" }, ...flatArray(untransformedDOM));
        let app = await transform(untransformedDOM);
        if (app instanceof Array) app = h("div", { ffautocreate: "root" }, ...flatArray(app));
        // app.children = flatArray(app.children);
        console.log(app);
        const patch = await diff(currentVDom, app);
        root = await patch(root);
        currentVDom = app;
    }
    catch (e) { console.error(e) };

    await onRerenderLate();
    rendering = false;
}

async function transform(vnode) {
    if (vnode === undefined || vnode === null) return null;
    if (vnode instanceof Array) {
        let _newArr = [];
        for (const node of flatArray(vnode)) {
            if (node !== undefined && node !== null) _newArr.push(await transform(node));
        }
        return _newArr;
    }
    if (typeof vnode.tagName === "function") {
        return await transform(await vnode.tagName(vnode.attrs, flatArray(vnode.children)));
    }
    if (typeof vnode === "object" && vnode.tagName && vnode.children && vnode.attrs && vnode.uuid && vnode.events) {
        const childs = flatArray(vnode.children); // DOES NOT WORK CORRECTLY
        const newChilds = [];
        while (childs.length > 0) {
            const rawEl = childs.shift();
            if (rawEl === undefined || rawEl === null) {}
            if (rawEl instanceof Array) childs.unshift(...flatArray(rawEl));
            else {
                const el = await transform(rawEl);
                if (el instanceof Array) childs.unshift(...flatArray(el));
                else if (typeof el === "string" || (el !== null && typeof el === "object" && el.attrs && el.children && el.tagName)) newChilds.push(el);
                else if (el !== null && el !== undefined) newChilds.push((typeof el === "string"
                || typeof el === "bigint")
                ? el.toString()
                : typeof el === "symbol"
                    ? el.description
                    : JSON.stringify(el));
            }
        }

        console.log(newChilds.map(el => el instanceof Array).includes(true));

        return {
            tagName: vnode.tagName,
            attrs: vnode.attrs,
            children: newChilds,
            events: vnode.events,
            uuid: vnode.uuid,
        };
    }
    else {
        return (typeof vnode === "string"
            || typeof vnode === "bigint")
            ? vnode.toString()
            : typeof vnode === "symbol"
                ? vnode.description
                : JSON.stringify(vnode);
    }
}


export const html = htm.bind(h);

let i = 0;
const states = [];

async function onRerender() {
    i = 0;
    iref = 0;
    ieffect = 0;
    imemo = 0;
    for (const listener of listeners.rerenderListeners) {
        try {
            await __try(listener);
        }
        catch (e) { }
    }

    await executeEffects();
}

async function onRerenderLate() {
    for (const listener of listeners.rerenderLateListeners) {
        try {
            await __try(listener);
        }
        catch (e) { }
    }
}

async function __try(f) {
    try { return await f(); } catch (e) { return e; }
}

export function useState(initialValue) {
    const index = i;
    i++;
    if (states[index] === undefined) states[index] = initialValue;

    function setState(state) {
        if (typeof state === "function") state = state(states[index]);
        if (states[index] === state) return;
        states[index] = state;
        rerender();
    }

    return [states[index], setState];
}

const listeners = {
    rerenderListeners: [],
    rerenderLateListeners: [],
}
const validListenerNames = ["rerender", "rerenderLate"];

export function once(ev, listener) {
    if (!validListenerNames.includes(ev)) return;
    if (typeof listener !== "function") return;
    listeners[ev + "Listeners"].push(listener);
}

const idstates = {};

/**
 *
 * @param {string} id The Identifier
 * @param {T} stdval The standard value
 * @returns {[T, (val: T)=>void]}
 */
export function useIDState(id, stdval) {
    // if (logEvents) console.log("using State with id", id);
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

let effects = [];
let ieffect = 0;

export function useEffect(func, to_change) {
    // if (logEvents) console.log("using Effect");
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

async function executeEffects() {
    effects = effects.map((el) => {
        if (typeof el.func == "function" && el.changed) {
            el.ret = el.func();
            el.changed = false;
        }
        return el;
    });
}

const refs = [];
let iref = 0;

export async function exec(cmd) {
    return await eval(cmd);
}

export function useRef(stdobj) {
    // if (logEvents) console.log("using Reference");
    if (refs[iref] == null || refs[iref] == undefined) {
        refs[iref] = {
            current: stdobj,
        };
    }
    iref++;
    return refs[iref - 1];
}

/**
*
* @param {(T, any)=>T} reducer get's called, when dispatch is called with the action and the current state
* @param {T} initialValue the initial Value
* @returns {[T, (any)=>void]} the State and the dispatch function
*/
export function useReducer(reducer, initialValue) {
    // if (logEvents) console.log("new reducer created with value", initialValue);
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
    // if (logEvents) console.log("Creating context", key, "with", el);
    contexts[key] = el;
}

/**
 * @param {string} key the key of the context
 * @returns {any} the value set for the context
 */
export function useContext(key) {
    // if (logEvents) console.log("using context", key);
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
                } catch { }
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

function publicRepresent() {
    if (!currentVDom || currentVDom === null || currentVDom === undefined) return "";
    return __representVDom(currentVDom);
}

function __representVDom(elements, pref = "") {
    elements = flatArray(elements);
    let str = "";
    for (const el of elements) {
        if (typeof el !== "object") str += pref + el.toString();
        str += `${pref}<${el.tagName.replaceAll("<", "\\<").replaceAll(">", "\\>").replaceAll("/", "\\/")} />\n${__representVDom((el.children || []), pref + "  ")}`;
    }
    str.substring(0, str.length - 1);
    return str;
}

export function represent() { return publicRepresent(); }

window.__featherframe__ = {
    represent: publicRepresent,
}

export function isValidVNode(vnode) {
    return (
        exist(vnode.tagName)
        && isStr(vnode.tagName)
        && exist(vnode.children)
        && exist(vnode.uuid)
        && isStr(vnode.uuid)
        && exist(vnode.attrs)
        && isObj(vnode.attrs)
        && exist(vnode.events)
        && isObj(vnode.events)
    );
}

function isStr(val) { return typeof val === "string" }
function isObj(val) { return typeof val === "object" }
function exist(val) { return (val !== undefined && val !== null); }

export function getFuncName(f) {
    return f.name || "anonymous";
}