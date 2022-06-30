const { application } = require("express");

const { redBright } = require("chalk");

class App {
    #path;
    #config;
    #html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>%style</style></head><body><script src="%path" type="module"></script></body></html>`;
    constructor(path) {
        this.#path=path;
        this.#config = require(require("path").join(path, "config.js"))(path);
        if (this.#config.customHTML) {
            this.#html=this.#config.customHTML.replaceAll("%name", this.#config.name)
            .replaceAll("%description", this.#config.description)
            .replaceAll("%apppath", path);
        }
        if (this.#config.launch) console.error(redBright("Auto Launch of additional programs is not yet implemented :<"));
    }
    get path() {return this.#path;}
    get html() {return this.#html;}
    get config() {return this.#config;}
}

let app;

/**
 * 
 * @param {string} path 
 * @param {Application} express
 * @param {{debugprint?: bool}} config
 * 
 * @returns {App} the application
 */
async function loadApp(path, express, config={debugprint: false}) {
    app = new App(path);
    await require("./router.js").route(app, express, config);
    return app;
}

module.exports = {
    loadApp,
    build: require("./router").build
}