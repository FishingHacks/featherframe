export {h, rerender, useState, useIDState, setTitle, getTitle, useEffect, useRef, useReducer, createContext, useContext } from "./engine";
import htm from 'https://unpkg.com/htm?module'
import { h, render as r } from "/engine";
export function requireCSS(src) {
    let link = document.createElement("link");
    link.href=src;
    link.rel="stylesheet";
    document.head.append(link);
}
export function render(children=()=>[], mnt=document.body) {
    return r({
        mnt,
        children
    })
}
export function requireScript(src, isModule=false) {
    let script = document.createElement("script");
    script.src=src;
    if(isModule)
        script.type="module";
    document.head.append(script);
}
export const html = htm.bind(h);
export function matchpath(path, pathname) {
    let spath = path.split("/");
    spath = spath.map(el=>el.startsWith(":")?"(.+)":el);
    if(new RegExp(spath.join("/")).exec(pathname) != null) {
        let ret1 = new RegExp(spath.join("/")).exec(pathname)
        ret1.shift();
        let ids = Object.keys(ret1);
        let ret2 = [];
        Object.values(ret1).forEach((el,i)=>{
            !isNaN(Number(ids[i]))?ret2.push(el):null;
        });
        let ret = {};
        spath = path.split("/");
        spath.forEach(el=>el.startsWith(":")?ret[el.substr(1)]=ret2.shift():null)
        return ret;
    }
    else {
        throw new Error("path cant mach pathname :<")
    }
}
