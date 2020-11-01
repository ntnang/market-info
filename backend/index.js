const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const Shopee = require("./model/shopee");
const shopee = require("./model/shopee");
const port = 3001;
const trackingInterval = 86400000;

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

app.get("/api/shopee/:itemId/:shopId", async (req, res) => {
  const query = { itemid: req.params.itemId, shopid: req.params.shopId };
  const itemExisted = await Shopee.exists(query);
  console.log(itemExisted);
  if (itemExisted) {
    Shopee.find(query, (err, shopees) => {
      shopees.forEach((shopee) => {
        const changedItem = saveChangedPriceItem(shopee);
        res.status(200).send(changedItem);
      });
    });
  } else {
    const url = `https://shopee.vn/api/v2/item/get?itemid=${req.params.itemId}&shopid=${req.params.shopId}`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        res.status(201).send(saveItem(data.item));
      });
  }
});

setInterval(() => {
  Shopee.find({}, (err, shopees) => {
    shopees.forEach((shopee) => {
      saveChangedPriceItem(shopee);
    });
  });
}, trackingInterval);

saveChangedPriceItem = (shopee) => {
  const url = `https://shopee.vn/api/v2/item/get?itemid=${shopee.itemid}&shopid=${shopee.shopid}`;
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (shopee.price_max != data.item.price_max) {
        return saveItem(data.item);
      }
    });
};

saveItem = (item) => {
  const shopeeItem = new Shopee({
    itemid: item.itemid,
    shopid: item.shopid,
    name: item.name,
    price_max: item.price_max,
  });
  shopeeItem.save((err) => {
    if (err) console.error(err);
  });
  return shopeeItem;
};

app.listen(port, () => console.log(`Listening on port ${port}...`));
