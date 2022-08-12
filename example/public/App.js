import { render, html, App } from "/framework";

(async ()=>{
    render(()=>html`
    <a href="/">Home</a>
    <a href="/demo">Demo</a>
    <${App} />
    `, document.getElementById("root"));
})();

import("/engine").then(e => window.e = e);