#!/usr/bin/env node

const { join } = require('path');
const fs = require('fs/promises');
const chalk = require('chalk');
const argsObj = require('command-line-parser')() || {};
const debugprint = argsObj.dp || argsObj.debug || argsObj.debugprint;
const { version, name } = require('../package.json');

function reachZero(r, v) {
    if (v.v <= 0) return r();
    setTimeout(() => reachZero(r, v), 100);
}
function printHelp() {
    // It was supposed to be designed as simple as possible...
    // Oh no! Anyways...
    // It looks good at least
    console.log(
        `┌──« Featherframe Help »───────────────────────────────────────────┐`
    );
    console.log(
        `│ <> - ${chalk.hex('#1ABC9C')('Required')} | [] - ${chalk.hex(
            '#AF601A'
        )('Optional')}                                    │`
    );
    console.log(
        `├──────────────────────────────────────────────────────────────────┤`
    );
    console.log(
        `│ ${chalk.underline(
            'Usage'
        )}                                                            │`
    );
    console.log(
        `│ ${chalk.bold(chalk.blue('$'))} ${chalk.cyan(
            'featherframe'
        )} ${chalk.hex('#1ABC9C')('<projectdirectory> <options>')} ${chalk.hex(
            '#AF601A'
        )('[port]')}               │`
    );
    console.log(
        `│ ${chalk.bold(chalk.blue('$'))} ${chalk.cyan(
            'featherframe'
        )} ${chalk.hex('#AF601A')(
            '-v'
        )}                                                │`
    );
    console.log(
        `│ ${chalk.bold(chalk.blue('$'))} ${chalk.cyan(
            'feahterframe'
        )} ${chalk.cyan('--build <projectdirectory>')} ${chalk.hex('#1ABC9C')(
            '<options>'
        )}              │`
    );
    console.log(
        `│ ${chalk.bold(chalk.blue('$'))} ${chalk.cyan(
            'feahterframe'
        )} ${chalk.cyan('--create <projectdirectory>')} ${chalk.hex('#1ABC9C')(
            '<title> <description>'
        )} │`
    );
    console.log(
        `│ ${chalk.bold(chalk.blue('$'))} ${chalk.cyan(
            'feahterframe'
        )} ${chalk.hex('#AF601A')(
            '--help'
        )}                                            │`
    );
    console.log(
        `├──────────────────────────────────────────────────────────────────┤`
    );
    console.log(
        `│ ${chalk.underline(
            'Options'
        )}                                                          │`
    );
    console.log(
        `│ ${chalk.hex('#1ABC9C')('-dp')} | ${chalk.hex('#1ABC9C')(
            '-debugprint'
        )} | ${chalk.hex('#1ABC9C')(
            '--debug'
        )} - Print debug Statements             │`
    );
    console.log(
        `├──────────────────────────────────────────────────────────────────┤`
    );
    console.log(
        `│ Visit the ${chalk.green('Wiki')} (${chalk.blue(
            'https://bit.ly/3Apkonb'
        )})                          │`
    );
    console.log(
        `└─${name} v${version}${'─'.repeat(63 - version.length - name.length)}┘`
    );
}

if (process.argv.length < 3) {
    printHelp();
    process.exit(1);
}

if (argsObj.v || argsObj.version) {
    console.log('featherframe v' + require('../package.json').version);
    process.exit(0);
}

if (argsObj.build) {
    if (typeof argsObj.build != 'string')
        return console.error(chalk.redBright('ERR: No path supplied'));
    const path = join(process.cwd(), process.argv[3]);
    process.chdir(join(process.argv[1], '../../'));
    const { build } = require('../framework/index.js');
    (async function () {
        console.info(
            'INFO: You only need to rebuild, when routes were added or removed. The Content of the files update automatically'
        );
        console.log('building...');
        const buildObj = await build(path, { debugprint });
        console.log('Finished build! Writing to file...');
        await require('fs/promises').writeFile(
            join(path, '.build.json'),
            JSON.stringify(buildObj)
        );
        console.log('Wrote to file! Finished...');
    })();
} else if (argsObj.create) {
    if (typeof argsObj.create != 'string')
        return console.error(chalk.redBright('ERR: No path supplied'));
    const path = join(process.cwd(), argsObj.create);
    (async function () {
        const { default: inquirer } = await import('inquirer');

        var _name = argsObj._args?.[0];
        var _desc = argsObj._args?.[1];

        const prompts = [
            {
                type: 'confirm',
                name: 'git',
                message: 'Use git version control?',
                default: false,
            },
        ];

        if (!_name || typeof _name !== 'string')
            prompts.push({
                type: 'input',
                message: 'name',
                name: 'name',
                default: _name && typeof _name === 'string' ? _name : '',
            });
        if (!_desc || typeof _desc !== 'string')
            prompts.push({
                type: 'input',
                message: 'description',
                name: 'desc',
                default: _desc && typeof _desc === 'string' ? _desc : '',
            });

        let { git, name, desc } = await inquirer.prompt(prompts);

        name ||= _name;
        desc ||= _desc;

        if (typeof name !== 'string')
            return console.error('Name is not a string');
        if (name.length < 3)
            return console.error('Name is less than 3 characters');

        if (typeof desc !== 'string')
            return console.error('Description is not a string');
        if (desc.length < 3)
            return console.error('Description is less than 3 characters');

        if (debugprint)
            console.log(
                'Initializing git repository:',
                git ? 'active' : 'inactive'
            );
        try {
            await fs.mkdir(path);
        } catch {}
        await fs.mkdir(join(path, 'middleware'));
        await fs.mkdir(join(path, 'pages'));
        await fs.mkdir(join(path, 'pages/api'));
        await fs.mkdir(join(path, 'public'));
        await fs.mkdir(join(path, 'public/pages'));
        left = { v: 0 };
        left.v++;
        writeFile(join(path, 'config.js'), [
            'const {join} = require("path")',
            '',
            '/**',
            ' * @param {string} path',
            ' * @returns {import("featherframe/types").config}',
            ' */',
            'module.exports = (path)=>({',
            '    name: "' +
                name.replaceAll('"', '\\"').replaceAll('\n', '\\n') +
                '",',
            '    description: "' +
                desc.replaceAll('"', '\\"').replaceAll('\n', '\\n') +
                '",',
            '    customHTML: require("fs").readFileSync(join(path, "index.html")).toString(),',
            '    e404page: require("fs").readFileSync(join(path, "404.html")).toString()',
            '});',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);
        left.v++;
        writeFile(join(path, 'index.html'), [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '    <!-- Allowed Replacers:',
            '         %name: The name as defined in config.js',
            '         %description: The description as defined in config.js',
            '         %style: Styles required by the Featherframe Devtools',
            '         %path: **Has to be in a type="module" script-tag**; The path to the javascript -->',
            '',
            '    <meta charset="UTF-8">',
            '    <meta http-equiv="X-UA-Compatible" content="IE=edge">',
            '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '    <title>%name</title>',
            '    <script src="%path" type="module"></script>',
            '    <style>%style</style>',
            '</head>',
            '<body>',
            '    <div id="root"></div>',
            '    <div id="FeatherFrameDevtools"></div>',
            '</body>',
            '</html>',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);
        left.v++;
        writeFile(join(path, '404.html'), [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '    <meta charset="UTF-8">',
            '    <meta http-equiv="X-UA-Compatible" content="IE=edge">',
            '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '    <title>Error 404 - Not found - Framework Example Application</title>',
            '</head>',
            '<body>',
            "    <h1>The site your trying to access wasn't found!</h1>",
            '    <a href="/">Home</a>',
            '</body>',
            '</html>',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);
        left.v++;
        writeFile(join(path, 'public/App.js'), [
            'const { render, html, App } = require("featherframe");',
            '',
            'render(() => html`<${App} />`, document.getElementById("root"));',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);
        left.v++;
        writeFile(join(path, 'public/pages/index.js'), [
            'const { html, requireCSS } = require("featherframe");',
            '',
            'requireCSS("/style.css")',
            '',
            'export async function render() {',
            '    return html`',
            '    <div style="width: 100vw; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">',
            '        <h1>Hello, World!</h1>',
            '        <p>A new Featherframe App! Edit <a href="/__featherframe/preview?url=/pages/index.js" target="_blank" style="margin: 0 .25em">/public/pages/index.js</a> to change the contents of this Site.</p>',
            '        <p>Also, check out the <a href="https://github.com/FishingHacks/featherframe/wiki" target="_blank" style="margin: 0 .25em">Wiki</a> for more help</p>',
            '    </div>',
            '    `;',
            '}',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);
        left.v++;
        writeFile(join(path, 'pages/api/index.js'), [
            '/**',
            ' * ',
            ' * @param {import("express").Request} req',
            ' * @param {import("express").Response} res',
            ' */',
            'module.exports = (req, res) => {',
            "    res.json({ response: 'Hello :>' })",
            '}',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);
        left.v++;
        writeFile(join(path, 'middleware/index.js'), [
            '/**',
            ' * ',
            ' * @param {import("express").Request} req',
            ' * @param {import("express").Response} res',
            ' * @param {import("express").NextFunction} next',
            ' */',
            'module.exports = function(req, res, next) {',
            '    next();',
            '}',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);

        left.v++;
        writeFile(join(path, 'public/style.css'), [
            'body {',
            '    background-color: rgb(46, 46, 46);',
            '    color: rgb(236, 241, 245);',
            '    font-size: 2rem;',
            '    overflow: hidden;',
            '}',
            '',
            'a {',
            '    color: rgb(170, 170, 170);',
            '    text-decoration: none;',
            '',
            '',
            '    background-image: linear-gradient(90deg, red, blue);',
            '    background-repeat: no-repeat;',
            '    background-position: bottom left;',
            '    background-size: 0% 12%;',
            '    transition: background-size 500ms ease-in-out,',
            '                color 300ms ease-in-out;',
            '}',
            '',
            'a:hover,',
            'a:active,',
            'a.active {',
            '  background-size: 100% 12%;',
            '  color: rgb(88, 88, 197);',
            '}',
            '',
            '#root {',
            '    display: flex;',
            '    flex-direction: column;',
            '    justify-content: center;',
            '    align-items: center;',
            '',
            '    height: 100vh;',
            '    width: 100vw;',
            '}',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);
        left.v++;
        writeFile(join(path, 'package.json'), [
            '{',
            '  "name": "' + name.replaceAll('"', '\\"') + '",',
            '  "version": "1.0.0",',
            '  "description": "' + desc.replaceAll('"', '\\"') + '",',
            '  "scripts": {',
            '    "start": "featherframe ."',
            '  },',
            '  "dependencies": {',
            '    "featherframe": "latest",',
            '    "@types/express": "latest"',
            '  }',
            '}',
        ])
            .then(() => left.v--)
            .catch(() => left.v--);
        await new Promise((r) => reachZero(r, left));
        console.log(
            chalk.greenBright(
                'Your Project "' +
                    name +
                    '" in folder "' +
                    path.replace(process.cwd(), '').substring(1) +
                    "\" was successfully set up! Run 'npm install' to install all dependencies.\nRun the App with 'npm start'.\nEdit the package.json as you please"
            )
        );
        if (git) {
            const { spawnSync } = require('child_process');
            spawnSync('git init', { cwd: path, shell: true });
            spawnSync('git add .', { cwd: path, shell: true });
            spawnSync(
                'git commit -m "FF Initial Commit (featherframe create)"',
                { cwd: path, shell: true }
            );
        }
    })();
} else if (argsObj.help) {
    printHelp();
} else {
    if (!argsObj._args || !argsObj._args[0])
        return console.error(chalk.redBright('ERR: No path supplied'));
    let options = { debugprint };

    const path = join(process.cwd(), argsObj._args[0]);
    const port = argsObj._args[1] || 8080;

    const express = require('express')();
    process.chdir(join(argsObj._args[0], '../../'));
    const { loadApp } = require('../server/index.js');

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
    return fs
        .writeFile(path, contents.join('\n'))
        .catch((e) => console.error(e));
}
