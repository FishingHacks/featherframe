export {h, rerender, useState, useIDState, setTitle, getTitle} from "./engine";
import htm from 'https://unpkg.com/htm?module'
import {h, render as r } from "/engine";
export function render(func) {
    return r({children: func});
}
export function requireCSS(src) {
    let link = document.createElement("link");
    link.href=src;
    link.rel="stylesheet";
    document.head.append(link);
}
export function requireScript(src, isModule=false) {
    let script = document.createElement("script");
    script.src=src;
    if(isModule)
        script.type="module";
    document.head.append(script);
}
export const html = htm.bind(h);