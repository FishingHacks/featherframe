const { application } = require('express');
const {
    existsSync,
    lstatSync,
    constants: { R_OK, W_OK },
} = require('fs');
const { join } = require('path');
const { access, readFile, lstat, readdir, stat } = require('fs/promises');
const { parseCookies } = require('./modules/parsers');
const { inspect } = require('util');

function waitForValueToReach0(pages, r) {
    if (pages.v == 0) return r();
    setTimeout(() => waitForValueToReach0(pages, r), 100);
}

process.chdir(join(module.path, '../'));

const path = require('path');
const fs = require('fs');
const { redBright } = require('chalk');

const AVAILABLE_METHODS = [
    'all',
    'checkout',
    'copy',
    'delete',
    'get',
    'head',
    'lock',
    'merge',
    'mkactivity',
    'mkcol',
    'move',
    'm-search',
    'notify',
    'options',
    'patch',
    'post',
    'purge',
    'put',
    'report',
    'search',
    'subscribe',
    'trace',
    'unlock',
    'unsubscribe',
];

/**
 *
 * @param {string} path path to the application
 * @param {{debugprint?: bool}} param1 config
 * @returns {Promise<{middlewarefiles: Array<string>, backendpages: Array<{origin: string, path: string, method: string, regex: string}>, frontendpages: Array<{regex: string, path: string, method: "all"}>, packages: Record<string, string>}>}
 */
async function build(path, { debugprint }) {
    let middlewaredir = join(path, 'middleware');
    let pagedir = join(path, 'pages');
    let publicpagedir = join(path, 'public', 'pages');

    // get middleware files
    const middlewarefiles = [];
    if (existsSync(middlewaredir) && isDir(middlewaredir)) {
        if (debugprint) console.log('Collecting middleware packages . . . .');
        let middlewarepkgs = [];
        await readdir(middlewaredir).then((data) =>
            data.forEach((el) => {
                if (!el.endsWith('.js')) return;
                if (!isFile(join(middlewaredir, el))) return;
                middlewarepkgs.push(join(middlewaredir, el));
            })
        );
        for (const i in middlewarepkgs) {
            middlewarefiles.push(middlewarepkgs[i]);
        }
    } else {
        if (debugprint) console.log(redBright('No Middleware directory'));
    }
    if (debugprint) console.log('Collecting pages...');

    const backendpages = await getPages(pagedir, debugprint);
    const frontendpages = (await getPubPages(publicpagedir, debugprint)).filter(
        (path) =>
            backendpages.find(
                (f) =>
                    f.path == path ||
                    f.path == path + '/' ||
                    f.path + '/' == path
            ) == undefined
    );
    const packages = await scanForPackages(
        publicpagedir,
        join(path, 'node_modules')
    );

    return {
        backendpages,
        frontendpages,
        middlewarefiles,
        packages,
    };
}

const REQUIRE_REGEX = /require\(("|'|`)([^"'`]+)("|'|`)\)/g;

/**
 *
 * @param {string} dir
 * @returns {Promise<Record<string, string>>}
 */
async function scanForPackages(dir, dir_node_modules) {
    try {
        let fileStats = await stat(dir_node_modules);
        if (!fileStats.isDirectory()) {
            throw new Error('node_modules is not a directory ftw');
        }
    } catch {
        throw new Error(
            'Could not find node_modules. Are you sure you did `npm install`?'
        );
    }

    /** @type {Record<string, string>} */
    let packages = {};

    await Promise.allSettled(
        (
            await tree(dir)
        ).map(async function (file) {
            let str = (await readFile(file)).toString();
            for (const match of str.matchAll(REQUIRE_REGEX)) {
                if (
                    typeof match[2] == 'string' &&
                    match[2] != 'framework' &&
                    match[2] != 'featherframe'
                ) {
                    try {
                        let main = require(join(
                            dir_node_modules,
                            match[2],
                            'package.json'
                        ))?.main;
                        if (!main)
                            throw new Error(
                                'package.json does not contain a main field'
                            );

                        try {
                            let fileStats = await stat(
                                join(dir_node_modules, match[2], main)
                            );
                            if (fileStats.isFile()) {
                                packages[match[2]] = join(
                                    '__featherframe/package',
                                    match[2],
                                    main
                                );
                            } else if (fileStats.isDirectory()) {
                                let file = join(
                                    '__featherframe/package',
                                    match[2],
                                    main,
                                    'index.js'
                                );
                                let fileStats = await stat(file);
                                if (!fileStats.isFile()) {
                                    throw 0;
                                } else {
                                    packages[match[2]] = file;
                                }
                            } else {
                                throw 0;
                            }
                        } catch {
                            throw new Error('Could not find the main file');
                        }
                    } catch (e) {
                        console.log(
                            'Failed to load package %s: %s',
                            match[2],
                            e
                        );
                    }
                }
            }
        })
    );

    console.log('Found packages: %s', Object.keys(packages).join(', '));
    return packages;
}

/**
 * @param {import("../types").App} app
 * @param {application} express
 * @param {{debugprint?: bool}} param1 config
 */
async function route(app, express, { debugprint }) {
    const express_static = require('express').static;

    const path = app.path;
    let publicdir = join(path, 'public');
    let packagedir = join(path, 'node_modules');

    /** @type {{middlewarefiles: Array<string>, backendpages: Array<{origin: string, path: string, method: string, regex: string}>, frontendpages: Array<{regex: string, path: string, method: "all"}>, packages: Record<string, string>}} */
    let pkg = {};

    if (existsSync(join(path, '.build.json'))) {
        if (debugprint) console.log('Buildfile found');
        pkg = require(join(path, '.build.json'));
    } else {
        if (debugprint) console.log('Buildfile not found! Building Project...');
        pkg = await build(app.path, { debugprint });
        if (debugprint) console.log('Project Build');
    }

    // server renderengine first, so that nothing breaks (hopefully)
    const framework_content = (
        await readFile('renderengine/framework.js')
    ).toString();
    const engine_content = (
        await readFile('renderengine/engine.js')
    ).toString();

    const font_ttf_content = (
        await readFile('framework/font/font.ttf')
    ).toString();
    const font_css_content = (
        await readFile('framework/font/font.css')
    ).toString();

    const stdico_content = await readFile('framework/stdlogo.ico');

    express.use((req, res, next) => {
        if (req.headers.cookie) {
            req.cookies = parseCookies(req.headers.cookie, false);
            req.serializedCookies = parseCookies(req.headers.cookie, false);
        }
        next();
    });

    express.get('/__featherframe/font/font.ttf', (req, res) => {
        res.set({ 'Content-Type': 'font/ttf' });
        res.send(font_ttf_content);
    });
    express.get('/__featherframe/font/font.css', (req, res) => {
        res.set({ 'Content-Type': 'text/css; charset=UTF-8' });
        res.send(font_css_content);
    });

    for (const package of Object.keys(pkg.packages)) {
        try {
            console.log(
                'Hosting %s on %s',
                join(packagedir, package),
                join('/__featherframe/package', package)
            );
            express.use(
                join('/__featherframe/package', package),
                express_static(join(packagedir, package))
            );
        } catch {
            console.log('Failed to host package %s', package);
        }
    }

    // display the standard favicon, when none found
    if (
        !existsSync(join(publicdir, 'favicon.ico')) ||
        !lstatSync(join(publicdir, 'favicon.ico')).isFile()
    ) {
        express.all('/favicon.ico', (req, res) => {
            res.set({ 'Content-Type': 'image/x-icon; charset=UTF-8' });
            res.send(stdico_content);
        });
    }
    express.get('/engine', async (req, res) => {
        res.set({ 'Content-Type': 'application/javascript; charset=UTF-8' });
        res.send(engine_content);
    });
    express.get('/framework', (req, res) => {
        res.set({ 'Content-Type': 'application/javascript; charset=UTF-8' });
        res.send(framework_content);
    });

    if (!existsSync(publicdir))
        return debugprint
            ? console.error(redBright('No public directory found!'))
            : null;

    for (const i in pkg.middlewarefiles)
        express.use(require(pkg.middlewarefiles[i]));

    const BACKEND_PGS = pkg.backendpages.map((el) => el.regex);
    const FRONTEND_PGS = pkg.frontendpages;
    function escapejs(string) {
        return string.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
    }
    const LOADER_CONTENT = `import { loadModule } from "/framework";
(async function() {
    function log(text, ...args){console.log("%c[featherframe/loader]%c "+text,"color:#d946ef;font-weight: bold","all:reset",...args);}
    async function __loadModule(path,name){log("Loading Module %s", name);await loadModule(path, name);log("Loaded Module %s", name);}
    log("Loading Packages...");
    await Promise.allSettled([${Object.entries(pkg.packages)
        .map(
            ([name, path]) =>
                `__loadModule("${escapejs(path)}", "${escapejs(name)}")`
        )
        .join(',')}]);
    log("Loading App..."); await import("/App.js"); log("Loaded App!");
})();`;

    express.get('/__featherframe/loader', (req, res) => {
        res.set({ 'Content-Type': 'application/javascript; charset=UTF-8' });
        res.send(LOADER_CONTENT);
    });

    express.get('/__featherframe/bckndpgs', (req, res) =>
        res.json(BACKEND_PGS)
    );
    express.get('/__featherframe/frndpgs', (req, res) =>
        res.json(FRONTEND_PGS)
    );
    express.get('/__featherframe/preview', async (req, res) => {
        if (!req.query.url || typeof req.query.url != 'string')
            return res.redirect('/');
        let url = req.query.url;
        if (url.startsWith('/')) url = url.substring(1);
        url = url.replaceAll('..', '');
        try {
            if (url != 'engine' && url != 'framework')
                await access(join(app.path, 'public', url), R_OK);

            if (url != 'engine' && url != 'framework')
                if (!(await lstat(join(app.path, 'public/', url))).isFile())
                    return res.redirect('/');
            // => Highlight.js + vs style
            let html = `
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>%title</title>
                        <style>pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{color:#abb2bf;background:#282c34}.hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}.hljs-doctag,.hljs-formula,.hljs-keyword{color:#c678dd}.hljs-deletion,.hljs-name,.hljs-section,.hljs-selector-tag,.hljs-subst{color:#e06c75}.hljs-literal{color:#56b6c2}.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string,.hljs-regexp,.hljs-string{color:#98c379}.hljs-attr,.hljs-number,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-pseudo,.hljs-template-variable,.hljs-type,.hljs-variable{color:#d19a66}.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-symbol,.hljs-title{color:#61aeee}.hljs-built_in,.hljs-class .hljs-title,.hljs-title.class_{color:#e6c07b}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}.hljs-link{text-decoration:underline}</style>
                        <style>
                        body { margin: 0; }
                        td.hljs-ln-line.hljs-ln-numbers { padding-right: 0.25em; border-right: 2px #18181b solid }
                        td.hljs-ln-line.hljs-ln-code { padding-left: 0.75em; }
                        td.hljs-ln-line.hljs-ln-numbers { cursor: pointer; }
                        td.hljs-ln-line.hljs-ln-numbers:hover { text-decoration: underline; }
                        .ln-selected { background-color: #164e63; }
                        </style>
                        <script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js"></script>
                        <script src="//cdn.jsdelivr.net/npm/highlightjs-line-numbers.js@2.8.0/dist/highlightjs-line-numbers.min.js"></script>
                        <script>


                            function load(){
                                hljs.highlightAll();
                                hljs.initLineNumbersOnLoad();
                                const url = new URL(window.location.href);
                                setTimeout(()=>{
                                    function select(element) {
                                        if (!element || !element.classList?.add || !element.scrollIntoViewIfNeeded) return;
                                        const selected = document.getElementsByClassName("ln-selected");
                                        for (let i = 0; i < selected.length; ++i) selected[i].classList.remove("ln-selected");

                                        element.scrollIntoViewIfNeeded?.();
                                        element.classList.add("ln-selected");
                                    }

                                    if(!isNaN(Number(url.searchParams.get("line")))) 
                                        select(document.querySelectorAll("td.hljs-ln-line.hljs-ln-numbers[data-line-number=\\"" + new URL(window.location.href).searchParams.get("line") + "\\"]")[0]?.parentElement);
                                    
                                    const line_number_elements = document.querySelectorAll("td.hljs-ln-line.hljs-ln-numbers");
                                    for (let i = 0; i < line_number_elements.length; ++i) {
                                        const id = line_number_elements[i].getAttribute("data-line-number");
                                        line_number_elements[i].addEventListener("click", () => {
                                            url.searchParams.set("line", id);
                                            select(line_number_elements[i].parentElement);
                                            history.replaceState(null, "", url.href);
                                        });
                                    }
                                }, 100);
                            }
                        </script>
                    </head>
                    <body onload="load();">
                        <pre style="margin: 0"><code class="language-javascript hljs" style="min-height: calc(100vh - 2em)">%src</code></pre>
                    </body>
                </html>`;
            html = html.replaceAll(
                '%title',
                url.split('/')[url.split('/').length - 1]
            );
            let source = 'Source missing';
            if (url != 'engine' && url != 'framework')
                source = (
                    await readFile(join(app.path, 'public/', url))
                ).toString();
            else if (url == 'engine') source = engine_content;
            else if (url == 'framework') source = framework_content;
            source = source
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;');
            let indexOfSrc = html.indexOf('%src');
            if (typeof indexOfSrc != 'number' || indexOfSrc < 0)
                return res
                    .status(200)
                    .send(
                        '<!DOCTYPE html><html><body><h1>Previewing files is not supported!</h1></body></html>'
                    );
            res.write(html.substring(0, indexOfSrc));
            res.write(source);
            res.write(html.substring(indexOfSrc + 4));
            res.status(200).end();
        } catch (e) {
            console.log(url + " doesn't exist", e);
            return res.redirect('/');
        }
    });

    for (const i in pkg.backendpages) {
        const el = pkg.backendpages[i];

        if (!AVAILABLE_METHODS.includes(el.method))
            debugprint
                ? console.error(
                      redBright(
                          'The method ' +
                              el.method +
                              ' is not a valid HTTP method :<'
                      )
                  )
                : null;
        else {
            if (debugprint)
                console.log(
                    `Registering ${el.method.toUpperCase()} ${el.path} `
                );
            const func = require(el.origin);
            express[el.method.toLowerCase()](
                el.path,
                async function (req, res, next, ...args) {
                    try {
                        func(req, res, next, ...args);
                    } catch (e) {
                        console.error(redBright('Error: ' + inspect(e)));
                        return res
                            .status(500)
                            .send('Error: Internal Server Error');
                    }
                }
            );
        }
    }

    for (const i in pkg.frontendpages) {
        const el = pkg.frontendpages[i];
        const expressPath = el.path.replace(/index$/g, '');
        const func = function (req, res, next) {
            res.status(200).send(
                app.html
                    .replaceAll('%path', `/__featherframe/loader`)
                    .replace(
                        '%style',
                        "@font-face {\n  font-family: Poppins;\n  src: url(/__featherframe/font/font.ttf) format('truetype'),\n}\ndiv#FeatherFrameDevTools, div#FeatherFrameDevTools > * {\n  font-family: monospace;\n  font-size: 18px;\n    color: inherit;\n  padding: 10px;\n    display: flex;\n  flex-direction: row;\n}\ndiv#FeatherFrameDevTools {\nborder: 1px black solid;\nwidth: fit-content;\nmargin: 5px;\npadding: 0px;\nborder-radius: 10px;\n}span#FFDTFN{color: blue;font-style: italic;}"
                    )
            );
        };
        if (debugprint) console.log(`Registering ALL ${expressPath}`);
        express.all(expressPath, function (req, res, next) {
            try {
                func(req, res, next);
            } catch (e) {
                console.error(redBright('Error: ' + inspect(e)));
                res.status(500).send('Error: Internal Server Error');
            }
        });
    }

    if (debugprint) console.log('Adding public directory middleware');
    express.use(express_static(publicdir));

    if (debugprint) console.log('Adding the error404-page');
    if (!app.config.e404page && debugprint)
        console.log('Custom 404 page not defined. Using the Standard 404 page');
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
    express.all('*', (req, res, next) => {
        res.headersSent ? next() : res.status(404).send(e404page);
    });
    process.chdir(app.path);
}

/**
 *
 * @param {string} pagedir
 * @param {boolean} debugprint
 * @returns {Promise<Array<{ path: string, method: string, origin: string, regex: string }>>}
 */
async function getPages(pagedir, debugprint) {
    if (!existsSync(pagedir)) {
        if (debugprint) console.log(redBright('No Serverside pages found'));
        return [];
    }

    /** @type {Array<{ path: string, method: string, origin: string, regex: string }>} */
    let pages = [];

    for (const origin of await tree(pagedir)) {
        if (!origin.endsWith('.js')) continue;

        let split_path = origin
            .substring(0, origin.length - 3)
            .replace(pagedir, '')
            .split('.');
        let method = split_path.pop();
        if (!AVAILABLE_METHODS.includes(method)) {
            split_path.push(method);
            method = 'get';
        }
        let path = split_path.join('.');
        if (path.endsWith('/index')) path = path.substring(0, path.length - 6);

        pages.push({
            method,
            origin,
            path,
            regex: Object.values(path)
                .map((el) =>
                    Object.values('*.(){}/\\[]+?').includes(el) ? '\\' + el : el
                )
                .join('')
                .replaceAll(/:[^/]+/g, '[^/]+'),
        });
    }
    return pages;
}

/**
 *
 * @param {string} publicpagedir
 * @param {boolean} debugprint
 * @returns {Promise<Array<{method: string, path: string, regex: string}>>}
 */
async function getPubPages(publicpagedir, debugprint) {
    if (!existsSync(publicpagedir)) {
        if (debugprint)
            console.log(redBright('No Pages for the renderengine found!'));
        return [];
    }

    /** @type {Array<{method: string, path: string, regex: string}>} */
    let paths = [];

    for (const origin of await tree(publicpagedir)) {
        if (!origin.endsWith('.js')) continue;
        let path = origin
            .substring(0, origin.length - 3)
            .replace(publicpagedir, '');

        if (path.endsWith('/index')) {
            paths.push({
                method: 'all',
                path,
                regex:
                    Object.values(path.substring(0, path.length - 6))
                        .map((el) =>
                            Object.values('*.(){}/\\[]+?').includes(el)
                                ? '\\' + el
                                : el
                        )
                        .join('')
                        .replaceAll(/:[^/]+/g, '[^/]+') || '\\/',
            });
        } else {
            paths.push({
                method: 'all',
                path,
                regex: Object.values()
                    .map((el) =>
                        Object.values('*.(){}/\\[]+?').includes(el)
                            ? '\\' + el
                            : el
                    )
                    .join('')
                    .replaceAll(/:[^/]+/g, '[^/]+'),
            });
        }
    }
    return paths;
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
