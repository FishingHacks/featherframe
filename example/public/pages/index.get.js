import {html, render, useIDState, useRef, useEffect } from "/framework";

render(()=>{
    let [count, setCount] = useIDState("counterone", 0);
    let old = useRef(0);
    let btn = useRef(null)

    // why this works? First, the old value is rendered, and after render the old value is updated. Because this is a Ref, there will be no new render
    useEffect(()=>old.current = count);

    useEffect(()=>console.log(btn.current), 0)

    let arr = ["a", "b", "c"]

    return html`
        <p>${count.toString()} (${/* is useeffect and useref working? */old.current.toString()})</p>
        <button ref=${btn/* there should be a button element in the console, when referencing works */} onclick=${()=>setCount(count + 1)}>+1</button>
        <button onclick=${()=>setCount(count - 1)}>-1</button>
        ${
            // see if expanding of arrays work
            arr.map(el=>arr.map(el=>html`<p>${el}</p>`))
        }
        `
})