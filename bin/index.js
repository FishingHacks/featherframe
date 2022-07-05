#!/usr/bin/env node
const { join } = require("path");
const fs = require("fs/promises");
const chalk = require("chalk");
const argsObj = require("command-line-parser")() || {};
const debugprint = argsObj.dp || argsObj.debug || argsObj.debugprint;

function reachZero(r, v) {
  if (v.v <= 0) return r();
  setTimeout(() => reachZero(r, v), 100);
}
function printHelp() {
  // It was supposed to be designed as simple as possible...
  // Oh no! Anyways...
  // It looks good at least
  console.log(
    `┌──FeatherFrame Help───────────────────────────────────────────────┐`
  );
  console.log(
    `│ <> - ${chalk.hex("#1ABC9C")("Required")} | [] - ${chalk.hex("#AF601A")(
      "Optional"
    )}                                    │`
  );
  console.log(
    `├──────────────────────────────────────────────────────────────────┤`
  );
  console.log(
    `│ ${chalk.underline(
      "Usage"
    )}                                                            │`
  );
  console.log(
    `│ ${chalk.bold(chalk.blue("$"))} ${chalk.cyan("featherframe")} ${chalk.hex(
      "#1ABC9C"
    )("<projectdirectory> <options>")} ${chalk.hex("#AF601A")(
      "[port]"
    )}               │`
  );
  console.log(
    `│ ${chalk.bold(chalk.blue("$"))} ${chalk.cyan("featherframe")} ${chalk.hex(
      "#AF601A"
    )("-v")}                                                │`
  );
  console.log(
    `│ ${chalk.bold(chalk.blue("$"))} ${chalk.cyan(
      "feahterframe"
    )} ${chalk.cyan("--build <projectdirectory>")} ${chalk.hex("#1ABC9C")(
      "<options>"
    )}              │`
  );
  console.log(
    `│ ${chalk.bold(chalk.blue("$"))} ${chalk.cyan(
      "feahterframe"
    )} ${chalk.cyan("--create <projectdirectory>")} ${chalk.hex("#1ABC9C")(
      "<title> <description>"
    )} │`
  );
  console.log(
    `│ ${chalk.bold(chalk.blue("$"))} ${chalk.cyan("feahterframe")} ${chalk.hex(
      "#AF601A"
    )("--help")}                                            │`
  );
  console.log(
    `├──────────────────────────────────────────────────────────────────┤`
  );
  console.log(
    `│ ${chalk.underline(
      "Options"
    )}                                                          │`
  );
  console.log(
    `│ ${chalk.hex("#1ABC9C")("-dp")} | ${chalk.hex("#1ABC9C")(
      "-debugprint"
    )} | ${chalk.hex("#1ABC9C")(
      "--debug"
    )} - Print debug Statements             │`
  );
  console.log(
    `├──────────────────────────────────────────────────────────────────┤`
  );
  console.log(
    `│ Visit the ${chalk.green("Wiki")} (${chalk.blue(
      "https://bit.ly/3Apkonb"
    )})                          │`
  );
  console.log(
    `└──────────────────────────────────────────────────────────────────┘`
  );
}

if (process.argv.length < 3) {
  printHelp();
  process.exit(1);
}

if (argsObj.v || argsObj.version) {
  console.log("featherframe v" + require("../package.json").version);
  process.exit(0);
}

if (argsObj.build) {
  if (typeof argsObj.build != "string")
    return console.error(chalk.redBright("ERR: No path supplied"));
  const path = join(process.cwd(), process.argv[3]);
  process.chdir(join(process.argv[1], "../../"));
  const { build } = require("../framework/index.js");
  (async function () {
    console.info(
      "INFO: You only need to rebuild, when routes were added or removed. The Content of the files update automatically"
    );
    console.log("building...");
    const buildObj = await build(path, { debugprint });
    console.log("Finished build! Writing to file...");
    await require("fs/promises").writeFile(
      join(path, ".build.json"),
      JSON.stringify(buildObj)
    );
    console.log("Wrote to file! Finished...");
  })();
} else if (argsObj.create) {
  if (typeof argsObj.create != "string")
    return console.error(chalk.redBright("ERR: No path supplied"));
  if (!argsObj._args || !argsObj._args[0] || !argsObj._args[1])
    return console.error(
      chalk.redBright("ERR: No name and/or description provided")
    );
  const path = join(process.cwd(), argsObj.create);
  const name = argsObj._args[0];
  const desc = argsObj._args[1];
  (async function () {
    await fs.mkdir(path);
    await fs.mkdir(join(path, "middleware"));
    await fs.mkdir(join(path, "pages"));
    await fs.mkdir(join(path, "pages/api"));
    await fs.mkdir(join(path, "public"));
    await fs.mkdir(join(path, "public/pages"));
    left = { v: 0 };
    left.v++;
    writeFile(join(path, "config.js"), [
      'const {join} = require("path")',
      "",
      "/**",
      " * @param {string} path",
      " * @returns {{name: string,description: string,launch?: Array<string>,customHTML?: string}}",
      " */",
      "module.exports = (path)=>({",
      '    name: "' +
        name.replaceAll('"', '\\"').replaceAll("\n", "\\n") +
        '",',
      '    description: "' +
        desc.replaceAll('"', '\\"').replaceAll("\n", "\\n") +
        '",',
      '    customHTML: require("fs").readFileSync(join(path, "index.html")).toString(),',
      '    e404page: require("fs").readFileSync(join(path, "404.html")).toString()',
      "});",
    ])
      .then(() => left.v--)
      .catch(() => left.v--);
    left.v++;
    writeFile(join(path, "index.html"), [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '    <meta charset="UTF-8">',
      '    <meta http-equiv="X-UA-Compatible" content="IE=edge">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "    <title>%name</title>",
      '    <script src="%path" type="module"></script>',
      "    <style>%style</style>",
      "</head>",
      "<body>",
      '    <div id="root"></div>',
      '    <div id="FeatherFrameDevtools"></div>',
      "</body>",
      "</html>",
    ])
      .then(() => left.v--)
      .catch(() => left.v--);
    left.v++;
    writeFile(join(path, "404.html"), [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '    <meta charset="UTF-8">',
      '    <meta http-equiv="X-UA-Compatible" content="IE=edge">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "    <title>Error 404 - Not found - Framework Example Application</title>",
      "</head>",
      "<body>",
      "    <h1>The site your trying to access wasn't found!</h1>",
      '    <a href="/">Home</a>',
      "</body>",
      "</html>",
    ])
      .then(() => left.v--)
      .catch(() => left.v--);
    left.v++;
    writeFile(join(path, "public/App.js"), [
      'import { render, html, App } from "/framework";',
      "",
      "(async ()=>{",
      "    render(()=>html`",
      "    <${App} />",
      '    `, document.getElementById("root"));',
      "})();",
    ])
      .then(() => left.v--)
      .catch(() => left.v--);
    left.v++;
    writeFile(join(path, "public/pages/index.js"), [
      'const { html } = require("feahterframe");',
      "",
      "export async function render() {",
      "  return html`",
      "    ",
      "  `;",
      "}",
    ])
      .then(() => left.v--)
      .catch(() => left.v--);
    left.v++;
    writeFile(join(path, "pages/api/index.js"), [
      "module.exports = (req, res) => {",
      "    ",
      "}",
    ])
      .then(() => left.v--)
      .catch(() => left.v--);
    left.v++;
    writeFile(join(path, "middleware/index.js"), [
      "module.exports = function(req, res, next) {",
      "    ",
      "}",
    ])
      .then(() => left.v--)
      .catch(() => left.v--);
    left.v++;
    writeFile(join(path, "package.json"), [
      "{",
      '  "name": "",',
      '  "version": "1.0.0",',
      '  "description": "",',
      '  "scripts": {',
      '    "start": "featherframe ."',
      "  },",
      '  "dependencies": {',
      '    "featherframe": "^1.3.1"',
      "  }",
      "}",
    ])
      .then(() => left.v--)
      .catch(() => left.v--);
    await new Promise((r) => reachZero(r, left));
    console.log(
      chalk.greenBright(
        'Your Project "' +
          name +
          '" in folder "' +
          path +
          "\" was successfully set up! Run 'npm install' to install all dependencies.\nRun the App with 'npm start'.\nPersonalize the package.json as you please"
      )
    );
  })();
} else if (argsObj.help) {
  printHelp();
} else {
  if (!argsObj._args || !argsObj._args[0])
    return console.error(chalk.redBright("ERR: No path supplied"));
  let options = { debugprint };

  const path = join(process.cwd(), argsObj._args[0]);
  const port = argsObj._args[1] || 8080;

  const express = require("express")();
  process.chdir(join(argsObj._args[0], "../../"));
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

function writeFile(path, contents) {
  return fs.writeFile(path, contents.join("\n")).catch((e) => console.error(e));
}
