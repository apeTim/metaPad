const express = require("express");
const app = express();
const PORT = 3001;

app.use("/public", express.static(__dirname + "/public"));

app.listen(PORT, () => {
  console.log(`Application started and Listening on PORT: ${PORT}`);
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/view/index.html");
});

app.get("/ido", (req, res) => {
  res.sendFile(__dirname + "/view/ido.html");
});

app.get("/projects", (req, res) => {
  res.sendFile(__dirname + "/view/list.html");
});

app.get("/projects/memekiller", (req, res) => {
  res.sendFile(__dirname + "/view/projects/memekiller.html");
});