const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const Shopee = require("./model/shopee");
const port = 3001;

app.use(cors());

mongoose.connect("mongodb://localhost/market-info", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const dbConnection = mongoose.connection;
dbConnection.on("error", console.error.bind(console, "connection error:"));
dbConnection.once("open", () => {
  console.log("connection opened");
});

app.get("/api/shopee/:itemId/:shopId", (req, res) => {
  const url = `https://shopee.vn/api/v2/item/get?itemid=${req.params.itemId}&shopid=${req.params.shopId}`;
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const newTrackedItem = new Shopee({
        itemid: data.item.itemid,
        shopid: data.item.shopid,
        name: data.item.name,
        price_max: data.item.price_max,
      });
      newTrackedItem.save((err) => {
        if (err) console.error(err);
      });
      res.status(201).send(newTrackedItem);
    });
});

app.listen(port, () => console.log(`Listening on port ${port}...`));
