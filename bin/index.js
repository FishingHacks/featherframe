#!/usr/bin/env node

const { join } = require("path");
const chalk = require("chalk");

if (process.argv.length < 3) {
    console.log("<> - Required | [] - Optional");
    console.log("---");
    console.log("Usage: lightframe <projectdirectory> <options> [port]");
    console.log("lightframe -v");
    console.log("---");
    console.log("Options:")
    console.log("-dp | -debugprint | --debug - Print debug Statements")
    process.exit(1);
}

if(process.argv[2] == "-v" || process.argv[2] == "--version") {
    console.log("lightframe v" + require("../package.json").version);
    process.exit(0);
}

let options = {};

if(process.argv[3] == "-dp" || process.argv[3] == "-debugpring" || process.argv[3]=="--debug") {
    options.debugprint = true;
    if(process.argv[4]) process.argv[3] = process.argv[4];
    else process.argv[3]=0;
}

const path = join(process.cwd(), process.argv[2]);
const port = (process.argv[3] || 8080);

const express = require("express")();
process.chdir(join(process.argv[1], "../../"))
const { loadApp } = require("../framework/index.js");

(async function() {
    await loadApp(path, express, options);

    express.listen(port, ()=>console.log(`\n      ${chalk.blueBright(`Listening on ${chalk.green(`http://localhost:${port}`)}`)}\n`));
})();