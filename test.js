const { loadApp } = require("./framework/index");
const express = require("express");

const app = express();

loadApp("/home/jason/js/framework-new/example", app).then(() => {
  app.listen(8080, () => console.log("http://localhost:8080"));
  console.log(app.routes);
});
