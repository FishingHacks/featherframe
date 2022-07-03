const { application } = require("express");
const {
  existsSync,
  lstatSync,
  constants: { R_OK, W_OK },
} = require("fs");
const { join } = require("path");
const { access, readFile, lstat, readdir } = require("fs/promises");
const { parseCookies } = require("./modules/parsers");
const { inspect } = require("util");

function waitForValueToReach0(pages, r) {
  if (pages.v == 0) return r();
  setTimeout(() => waitForValueToReach0(pages, r), 100);
}

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

/**
 *
 * @param {string} path path to the application
 * @param {{debugprint?: bool}} param1 config
 * @returns {{middlewarefiles: Array<string>, backendpages: Array<{origin: string, path: string, method: string, regex: string}>, frontendpages: Array<{regex: string, path: string}>}}
 */
async function build(path, { debugprint }) {
  let middlewaredir = join(path, "middleware");
  let pagedir = join(path, "pages");
  let publicpagedir = join(path, "public", "pages");

  // get middleware files
  const middlewarefiles = [];
  if (existsSync(middlewaredir) && isDir(middlewaredir)) {
    if (debugprint) console.log("Collecting middleware packages . . . .");
    let middlewarepkgs = [];
    await readdir(middlewaredir).then((data) =>
      data.forEach((el) => {
        if (!el.endsWith(".js")) return;
        if (!isFile(join(middlewaredir, el))) return;
        middlewarepkgs.push(join(middlewaredir, el));
      })
    );
    for (const i in middlewarepkgs) {
      middlewarefiles.push(middlewarepkgs[i]);
    }
  } else {
    if (debugprint) console.log(redBright("No Middleware directory"));
  }
  if (debugprint) console.log("Collecting pages...");

  const backendpages = [];
  const frontendpages = [];

  let pages = await getPages(pagedir, debugprint);

  (await getPubPages(publicpagedir, debugprint)).forEach((path) =>
    pages.includes(path) ? null : pages.push(path)
  );

  const pagesLeft = { v: pages.length };

  pages.forEach(async (el) => {
    if (debugprint)
      console.log("Collecting " + el.method.toUpperCase() + " " + el.path);
    const orig = join(path, "/pages/", `${el.path}.${el.method}.js`);
    try {
      await access(orig, R_OK);
      backendpages.push({
        origin: orig,
        path: el.path,
        method: el.method.toLowerCase(),
        regex: Object.values(el.path)
          .map((el) =>
            Object.values("*.(){}/\\[]+?").includes(el) ? "\\" + el : el
          )
          .join("")
          .replaceAll(/:[^/]+/g, "[^/]+"),
      });
    } catch (e) {
      frontendpages.push({
        path: el.path,
        regex: el.path.match(/^\/index +$/)
          ? "^\\/$"
          : Object.values(el.path.replace(/index$/g, ""))
              .map((el) =>
                Object.values("*.(){}/\\[]+?").includes(el) ? "\\" + el : el
              )
              .join("")
              .replaceAll(/:[^/]+/g, "[^/]+"),
      });
    }
    pagesLeft.v--;
  });

  await new Promise((r) => waitForValueToReach0(pagesLeft, r));

  return {
    backendpages,
    frontendpages,
    middlewarefiles,
  };
}

// at build, comment out or remove, as it is only for types
// const {App} = require("./types");
/**
 * @param {App} app
 * @param {application} express
 * @param {{debugprint?: bool}} param1 config
 */
async function route(app, express, { debugprint }) {
  const path = app.path;
  let publicdir = join(path, "public");
  let packagedir = join(path, "node_modules");

  let pkg = {};

  if (existsSync(join(path, ".build.json"))) {
    if (debugprint) console.log("Buildfile found");
    pkg = require(join(path, ".build.json"));
  } else {
    if (debugprint) console.log("Buildfile not found! Building Project...");
    pkg = await build(app.path, { debugprint });
    if (debugprint) console.log("Project Build");
  }

  // server renderengine first, so that nothing breaks (hopefully)
  const framework_content = await readFile("renderengine/framework.js");
  const engine_content = (await readFile("renderengine/engine.js")).toString();

  const font_ttf_content = (
    await readFile("framework/font/font.ttf")
  ).toString();
  const font_css_content = (
    await readFile("framework/font/font.css")
  ).toString();

  const stdico_content = await readFile("framework/stdlogo.ico");

  express.use((req, res, next) => {
    if (req.headers.cookie) {
      req.cookies = parseCookies(req.headers.cookie, false);
      req.serializedCookies = parseCookies(req.headers.cookie, false);
    }
    next();
  });

  express.get("/__featherframe/font/font.ttf", (req, res) => {
    res.set({ "Content-Type": "font/ttf" });
    res.send(font_ttf_content);
  });
  express.get("/__featherframe/font/font.css", (req, res) => {
    res.set({ "Content-Type": "text/css; charset=UTF-8" });
    res.send(font_css_content);
  });

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

  for (const i in pkg.middlewarefiles)
    express.use(require(pkg.middlewarefiles[i]));

  const BACKEND_PGS = pkg.backendpages.map((el) => el.regex);
  const FRONTEND_PGS = pkg.frontendpages;

  express.get("/__featherframe/loader", (req, res) => {
    res.set({ "Content-Type": "application/javascript; charset=UTF-8" });
    res.send('import "/framework";\nimport "/App.js";');
  });

  express.get("/__featherframe/bckndpgs", (req, res) => res.json(BACKEND_PGS));
  express.get("/__featherframe/frndpgs", (req, res) => res.json(FRONTEND_PGS));
  express.get("/__featherframe/preview", async (req, res) => {
    if (!req.query.url || typeof req.query.url != "string")
      return res.redirect("/");
    let url = req.query.url;
    if (url.startsWith("/")) url = url.substring(1);
    url = url.replaceAll("..", "");
    try {
      if (url != "engine" && url != "framework")
        await access(join(app.path, "public", url), R_OK);

      if (url != "engine" && url != "framework")
        if (!(await lstat(join(app.path, "public/", url))).isFile())
          return res.redirect("/");
      // => Highlight.js + vs style
      let html =
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>%title</title><style>pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{color:#abb2bf;background:#282c34}.hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}.hljs-doctag,.hljs-formula,.hljs-keyword{color:#c678dd}.hljs-deletion,.hljs-name,.hljs-section,.hljs-selector-tag,.hljs-subst{color:#e06c75}.hljs-literal{color:#56b6c2}.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#98c379}.hljs-attr,.hljs-number,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-pseudo,.hljs-template-variable,.hljs-type,.hljs-variable{color:#d19a66}.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-symbol,.hljs-title{color:#61aeee}.hljs-built_in,.hljs-class .hljs-title,.hljs-title.class_{color:#e6c07b}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}</style><script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js"></script><script>function load(){hljs.highlightAll();}</script></head><body onload="load();"><pre><code class="language-javascript">%src</code></pre></body></html>';
      html = html.replaceAll(
        "%title",
        url.split("/")[url.split("/").length - 1]
      );
      let source = "Source missing";
      if (url != "engine" && url != "framework")
        source = (await readFile(join(app.path, "public/", url))).toString();
      else if (url == "engine") source = engine_content;
      else if (url == "framework") source = framework_content;
      source = source
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      html = html.replaceAll("%src", source);
      res.status(200).send(html);
    } catch (e) {
      console.log(url + " doesn't exist", e);
      return res.redirect("/");
    }
  });

  for (const i in pkg.backendpages) {
    const el = pkg.backendpages[i];

    if (!AVAILABLE_METHODS.includes(el.method))
      debugprint
        ? console.error(
            redBright(
              "The method " + el.method + " is not a valid HTTP method :<"
            )
          )
        : null;
    else {
      if (debugprint)
        console.log(`Registering ${el.method.toUpperCase()} ${el.path} `);
      const func = require(el.origin);
      express[el.method.toLowerCase()](
        el.path,
        async function (req, res, next, ...args) {
          try {
            func(req, res, next, ...args);
          } catch (e) {
            console.error(redBright("Error: " + inspect(e)));
            return res.status(500).send("Error: Internal Server Error");
          }
        }
      );
    }
  }

  for (const i in pkg.frontendpages) {
    const el = pkg.frontendpages[i];
    const expressPath = el.path.replace(/index$/g, "");
    const func = function (req, res, next) {
      res
        .status(200)
        .send(
          app.html
            .replaceAll("%path", `/__featherframe/loader`)
            .replace(
              "%style",
              "@font@font-face {\n  font-family: Poppins;\n  src: url(/__featherframe/font/font.ttf) format('truetype'),\n}"
            )
        );
    };
    if (debugprint) console.log(`Registering ALL ${expressPath}`);
    express.all(expressPath, function (req, res, next) {
      try {
        func(req, res, next);
      } catch (e) {
        console.error(redBright("Error: " + inspect(e)));
        res.status(500).send("Error: Internal Server Error");
      }
    });
  }

  if (debugprint) console.log("Adding public directory middleware");
  express.use(require("express").static(publicdir));

  express.use("/packages", require("express").static(packagedir));

  if (debugprint) console.log("Adding the error404-page");
  if (!app.config.e404page && debugprint)
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
      <style>%style</style>
  </head>
  <body>
      <h1>The site your trying to access wasn't found!</h1>
      <a href="/">Home</a>
  </body>
  </html>`;
  express.all("*", (req, res, next) => {
    res.headersSent ? null : res.status(404).send(e404page);
  });
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

module.exports = { route, build };
