const { loadApp } = require("./server");
const express = require("express");
const { join } = require("path")

const app = express();

loadApp(join(process.cwd(), "./example"), app).then(() => {
  app.listen(8080, () => console.log("http://localhost:8080"));
  console.log(app.routes);
});
