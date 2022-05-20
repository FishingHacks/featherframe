const { application } = require("express");
const { App } = require("./types")
const { existsSync, readdirSync, lstatSync } = require("fs");
const { join } = require("path")
/**
 * @param {App} app 
 * @param {application} express 
 */
module.exports = function(app, express) {
    const path = app.path;
    let middlewaredir = join(path, "middleware");
    let pagedir = join(path, "pages");
    let publicpagedir = join(path, "public", "pages");
    let publicdir = join(path, "public");
    if (existsSync(middlewaredir) && isDir(middlewaredir)) {
        console.log("Collecting middleware packages . . . .");
        let middlewarepkgs = []
        readdirSync(middlewaredir).forEach(el=>{
            if (!el.endsWith(".js")) return;
            if (!isFile(join(middlewaredir, el))) return;
            middlewarepkgs.push(join(middlewaredir, el));
        });
        console.log("Registering middleware packages . . . .");
        middlewaredir.forEach(el=>app.use(require(el)));
    } else {
        console.log("No Middleware directory");
    }

}

function isDir(path) {
    return lstatSync(path).isDirectory();
}

function isFile(path) {
    return lstatSync(path).isFile();
}