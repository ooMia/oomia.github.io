const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(1111, () => {
  res.send("I am an endpoint1");
  console.log("listening on port 1111");
});

app.listen(3333, () => {
  res.send("I am an endpoint3");
  console.log("listening on port 3333");
});

app.listen(4444, () => {
  res.send("I am an endpoint4");
  console.log("listening on port 4444");
});

app.listen(8080, () => {
  console.log("listening on port 8080");
});
