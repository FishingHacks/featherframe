export {h, render, rerender, useState, useIDState, setTitle, getTitle} from "./engine";
import htm from 'https://unpkg.com/htm?module'
import {h} from "/engine"
export const html = htm.bind(h);