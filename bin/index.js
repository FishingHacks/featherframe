#!/usr/bin/env node

const { join } = require("path");
const chalk = require("chalk");

if (process.argv.length < 3) {
  console.log("<> - Required | [] - Optional");
  console.log("---");
  console.log("Usage: featherframe <projectdirectory> <options> [port]");
  console.log("featherframe -v");
  console.log("feahterframe --build <projectdirectory> <options>");
  console.log("---");
  console.log("Options:");
  console.log("-dp | -debugprint | --debug - Print debug Statements");
  process.exit(1);
}

if (process.argv[2] == "-v" || process.argv[2] == "--version") {
  console.log("lightframe v" + require("../package.json").version);
  process.exit(0);
}

if (process.argv[2] == "--build" && process.argv[3]) {
  let debugprint = false;
  if (process.argv[4])
    switch (process.argv[4]) {
      case "-dp":
      case "--debug":
      case "-debugprint":
        debugprint = true;
    }
  const path = join(process.cwd(), process.argv[3]);
  process.chdir(join(process.argv[1], "../../"));
  const { build } = require("../framework/index.js");
  (async function () {
    console.info("INFO: You only need to rebuild, when routes were added or removed. The Content of the files update automatically")
    console.log("building...")
    const buildObj = await build(path, { debugprint });
    console.log("Finished build! Writing to file...")
    await require("fs/promises").writeFile(join(path, ".build.json"), JSON.stringify(buildObj));
    console.log("Wrote to file! Finished...")
  })();
} else {
  let options = {};

  if (
    process.argv[3] == "-dp" ||
    process.argv[3] == "-debugpring" ||
    process.argv[3] == "--debug"
  ) {
    options.debugprint = true;
    if (process.argv[4]) process.argv[3] = process.argv[4];
    else process.argv[3] = 0;
  }

  const path = join(process.cwd(), process.argv[2]);
  const port = process.argv[3] || 8080;

  const express = require("express")();
  process.chdir(join(process.argv[1], "../../"));
  const { loadApp } = require("../server/index.js");

  (async function () {
    await loadApp(path, express, options);

    express.listen(port, () =>
      console.log(
        `\n      ${chalk.blueBright(
          `Listening on ${chalk.green(`http://localhost:${port}`)}`
        )}\n`
      )
    );
  })();
}
