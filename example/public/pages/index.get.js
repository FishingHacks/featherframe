import {html, render, useIDState} from "/framework";

render({children: ()=>{
    let [count, setCount] = useIDState("counterone", 0);
    return html`
        <p>${count.toString()}</p>
        <button onclick=${()=>setCount(count + 1)}>+1</button>
        <button onclick=${()=>setCount(count - 1)}>-1</button>
        `
}})