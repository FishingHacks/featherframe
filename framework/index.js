class App {
    #config;
    #html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><script src="%path"></script></body></html>`;
    constructor(path) {
        this.#config = require(require("path").join(path, "config.js"))(path);
        if (this.#config.customHTML) {
            this.#html=this.#config.customHTML.replaceAll("%name", this.#config.name).replaceAll("%description", this.#config.description);
        }
    }
    get html() {return this.#html;}
    get config() {return this.#config;}
}

let app;

/**
 * 
 * @param {string} path 
 */
function loadApp(path) {
    app = new App(path);
    return app;
}

module.exports = {
    loadApp
}