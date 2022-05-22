const { join } = require("path");

if (process.argv.length < 3) {
    console.log("<> - Required | [] - Optional");
    console.log("---");
    console.log("Usage: lightframe <projectdirectory> [port]");
    console.log("lightframe -v");
    process.exit(1);
}

if(process.argv[2] == "-v" || process.argv[2] == "--version") {
    console.log("lightframe v" + require(join(process.argv[1], "../../package.json")).version);
    process.exit(0);
}

const path = join(process.cwd(), process.argv[2]);
const port = (process.argv[3] || 8080);

const express = require("express")();
process.chdir(join(process.argv[1], "../../"))
const { loadApp } = require(join(process.argv[1], "../../framework/index.js"));

(async function() {
    await loadApp(path, express);

    express.listen(port, ()=>console.log(`Listening on http://localhost:${port}`));
})();