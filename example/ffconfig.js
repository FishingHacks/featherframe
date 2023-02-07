const {join} = require("path")

/**
 * @param {string} path
 * @returns {{name: string,description: string,launch?: Array<string>,customHTML?: string,useSSR?: boolean}}
 */
module.exports = (path)=>({
    name: "Framework Example Application",
    description: "The example App for Framework",
    customHTML: require("fs").readFileSync(join(path, "index.html")).toString(),
    e404page: require("fs").readFileSync(join(path, "404.html")).toString(),
    launch: [
        `node ${join(path, "custom-app/index.js")}`
    ],
    useSSR: true,
});