const { application } = require("express");
const {
  existsSync,
  readdirSync,
  lstatSync,
  constants: { R_OK, W_OK },
} = require("fs");
const { join } = require("path");
const { access, readFile } = require("fs/promises");

process.chdir(join(module.path, "../"));

const path = require("path");
const fs = require("fs");
const { redBright } = require("chalk");

const AVAILABLE_METHODS = [
  "all",
  "checkout",
  "copy",
  "delete",
  "get",
  "head",
  "lock",
  "merge",
  "mkactivity",
  "mkcol",
  "move",
  "m-search",
  "notify",
  "options",
  "patch",
  "post",
  "purge",
  "put",
  "report",
  "search",
  "subscribe",
  "trace",
  "unlock",
  "unsubscribe",
];

// at build, comment out or remove, as it is only for types
// const {App} = require("./types");
/**
 * @param {App} app
 * @param {application} express
 * @param {{debugprint?: bool}} pos1
 */
async function route(app, express, { debugprint }) {
  const path = app.path;
  let middlewaredir = join(path, "middleware");
  let pagedir = join(path, "pages");
  let publicpagedir = join(path, "public", "pages");
  let publicdir = join(path, "public");
  let packagedir = join(path, "node_modules");

  // server renderengine first, so that nothing breaks (hopefully)
  const framework_content = await readFile("renderengine/framework.js");
  const engine_content = await readFile("renderengine/engine.js");

  const stdico_content = await readFile("framework/stdlogo.ico");

  // display the standard favicon, when none found
  if (
    !existsSync(join(publicdir, "favicon.ico")) ||
    !lstatSync(join(publicdir, "favicon.ico")).isFile()
  ) {
    express.all("/favicon.ico", (req, res) => {
      res.set({ "Content-Type": "image/x-icon; charset=UTF-8" });
      res.send(stdico_content);
    });
  }

  express.get("/engine", async (req, res) => {
    res.set({ "Content-Type": "application/javascript; charset=UTF-8" });
    res.send(engine_content);
  });
  express.get("/framework", (req, res) => {
    res.set({ "Content-Type": "application/javascript; charset=UTF-8" });
    res.send(framework_content);
  });

  if (!existsSync(publicdir))
    return debugprint
      ? console.error(redBright("No public directory found!"))
      : null;
  if (existsSync(middlewaredir) && isDir(middlewaredir)) {
    if (debugprint) console.log("Collecting middleware packages . . . .");
    let middlewarepkgs = [];
    readdirSync(middlewaredir).forEach((el) => {
      if (!el.endsWith(".js")) return;
      if (!isFile(join(middlewaredir, el))) return;
      middlewarepkgs.push(join(middlewaredir, el));
    });
    if (debugprint) console.log("Registering middleware packages . . . .");
    middlewarepkgs.forEach((el) => express.use(require(el)));
  } else {
    if (debugprint) console.log(redBright("No Middleware directory"));
  }

  let pages = await getPages(pagedir, debugprint);

  (await getPubPages(publicpagedir, debugprint)).forEach((path) =>
    pages.includes(path) ? null : pages.push(path)
  );

  pages.forEach(async (el) => {
    if (!AVAILABLE_METHODS.includes(el.method.toLowerCase()))
      return debugprint
        ? console.error(
            redBright(
              "The method " + el.method + " is not a valid HTTP method :<"
            )
          )
        : null;
    if (debugprint)
      console.log(`Registering ${el.method.toUpperCase()} ${el.path}`);
      try {
        let func = (req,res,next)=>{}
        try {
          await access(orig, R_OK | W_OK);
          func = require(join(pagedir, `${el.path}.${el.method}.js`));
        } catch {
          func = (req, res, next) => {
            res.status(200).send(app.html.replaceAll("%path", `/App.js`));
          }
        }
        express[el.method.toLowerCase()](
          el.path.replace(/index$/, ""),
          async (req, res, next) => {
            try {
              func(req, res, next, req.params);
              return;
            } catch (e) {
              res.status(500).send("Error: Internal Server error");
              if (debugprint) console.log("Error:", e);
            }
          }
        );
      }
      catch (e) {
        console.error(redBright('[ERROR] An error occurred whilst trying to register an endpoint:\n' + require('util').format(e)))
      }
  });

  if (debugprint) console.log("Adding public directory middleware");
  express.use(require("express").static(publicdir));

  express.use("/packages", require("express").static(packagedir));

  if (debugprint) console.log("Adding the error404-page");
  if (!app.config.e404page)
    if (debugprint)
      console.log("Custom 404 page not defined. Using the Standard 404 page");
  let e404page =
    app.config.e404page ||
    `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error 404 - Not found</title>
  </head>
  <body>
      <h1>The site your trying to access wasn't found!</h1>
      <a href="/">Home</a>
  </body>
  </html>`;
  express.all("*", (req, res) =>
    res.headersSent ? null : res.status(404).send(e404page)
  );
  process.chdir(app.path);
}

async function getPages(pagedir, debugprint) {
  if (!existsSync(pagedir)) {
    if (debugprint) console.log(redBright("No Serverside pages found"));
    return [];
  }

  let paths = (await tree(pagedir))
    .filter((path) => path.endsWith(".js"))
    .map((el) => el.replace(pagedir, "").replace(/\.js$/, ""));
  return paths.map((el) => {
    let spltd = el.split(".");
    return { method: spltd.pop(), path: spltd.join() };
  });
}
/*  /\
    |  I know, they do practically the same thing, feel like this is more readable :>
    \/ */
async function getPubPages(publicpagedir, debugprint) {
  if (!existsSync(publicpagedir)) {
    if (debugprint)
      console.log(redBright("No Pages for the renderengine found!"));
    return [];
  }

  let paths = (await tree(publicpagedir))
    .filter((path) => path.endsWith(".js"))
    .map((el) => el.replace(publicpagedir, "").replace(/\.js$/, ""));
  return paths.map((el) => {
    return { method: "all", path: el };
  });
}

/**
 * @param {string} dir Directory to scan
 * @returns {Promise<Array<string>>}
 */
function tree(dir) {
  return new Promise((res, rej) =>
    walk(dir, (err, result) => (err ? rej(err) : res(result)))
  );
}

function walk(dir, done) {
  var results = [];
  fs.readdir(dir, function (err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function (file) {
      file = path.resolve(dir, file);
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

function isDir(path) {
  return lstatSync(path).isDirectory();
}

function isFile(path) {
  return lstatSync(path).isFile();
}

module.exports = route;
