/**
 * @param {string} path
 * @returns {{name: string,description: string,launch?: Array<string>,customHTML?: string}}
 */
module.exports = (path)=>({
    name: "Framework Example Application",
    description: "The example App for Framework",
    customHTML: require("fs").readFileSync(path + "/index.html").toString()
});