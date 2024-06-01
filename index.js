const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// build in middleware
app.use(express.json());
app.use(cors());

// for testing server
app.get("/", (req, res) => {
  res.send("Learn Verse server is running!");
});

app.listen(port, () => {
  console.log("Learn Verse server is running on port: ", port);
});
