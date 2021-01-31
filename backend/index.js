const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const Tiki = require("./model/tiki");
const Shopee = require("./model/shopee");
const port = 3001;
const trackingInterval = 3600000; // One hour

app.use(cors());

mongoose.connect("mongodb://localhost/market-info", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const dbConnection = mongoose.connection;
dbConnection.on("error", console.error.bind(console, "connection error:"));
dbConnection.once("open", () => {
  console.log("db connection opened");
});

app.get("/api/tiki/:id", async (req, res) => {
  const query = { id: req.params.id };
  const itemExisted = await Tiki.exists(query);
  if (itemExisted) {
    Tiki.findOne(query)
      .sort({ trackedDate: -1 })
      .exec((err, tiki) => {
        const changedItem = saveChangedPriceTikiItem(tiki);
        res.status(200).send(changedItem);
      });
  } else {
    const url = `https://tiki.vn/api/v2/products/${req.params.id}`;

    fetch(url, {
      headers: {
        "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
      },
    })
      .then((extRes) => extRes.json())
      .then((item) => {
        res.status(201).send(saveTikiItem(item));
      });
  }
});

app.get("/api/tiki/history/:id", async (req, res) => {
  const query = { id: req.params.id };
  const itemExisted = await Tiki.exists(query);
  if (itemExisted) {
    Tiki.find(query, (err, tikis) => {
      res.status(200).send(tikis);
    });
  }
});

app.get("/api/tiki/last/history/", (req, res) => {
  Tiki.findOne()
    .sort({ trackedDate: -1 })
    .exec((err, lastTrackedProduct) => {
      Tiki.find({ id: lastTrackedProduct.id })
        .sort({ trackedDate: 1 })
        .exec((err, tikis) => {
          res.status(200).send(tikis);
        });
    });
});

saveChangedPriceTikiItem = (tiki) => {
  const url = `https://tiki.vn/api/v2/products/${tiki.id}`;
  fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  })
    .then((res) => res.json())
    .then((item) => {
      if (tiki.price != item.price) {
        return saveTikiItem(item);
      }
    });
};

saveTikiItem = (item) => {
  const tikiItem = new Tiki({
    id: item.id,
    name: item.name,
    price: item.price,
    thumbnail_url: item.thumbnail_url,
    current_seller: {
      id: item.current_seller.id,
      store_id: item.current_seller.store_id,
      name: item.current_seller.name,
      slug: item.current_seller.slug,
      sku: item.current_seller.sku,
      price: item.current_seller.price,
      logo: item.current_seller.logo,
      product_id: item.current_seller.product_id,
    },
    trackedDate: new Date(),
  });
  tikiItem.save((err) => {
    if (err) console.error(err);
  });
  return tikiItem;
};

app.get("/api/shopee/get/:itemId/:shopId", (req, res) => {
  const url = `https://shopee.vn/api/v2/item/get?itemid=${req.params.itemId}&shopid=${req.params.shopId}`;
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      res.status(200).send(data);
    });
});

app.get("/api/shopee/track/:itemId/:shopId", async (req, res) => {
  const query = { itemid: req.params.itemId, shopid: req.params.shopId };
  const itemExisted = await Shopee.exists(query);
  if (itemExisted) {
    Shopee.findOne(query)
      .sort({ trackedDate: -1 })
      .exec((err, shopee) => {
        const changedItem = saveChangedPriceShopeeItem(shopee);
        res.status(200).send(changedItem);
      });
  } else {
    const url = `https://shopee.vn/api/v2/item/get?itemid=${req.params.itemId}&shopid=${req.params.shopId}`;
    fetch(url)
      .then((extRes) => extRes.json())
      .then((data) => {
        res.status(201).send(saveShopeeItem(data.item));
      });
  }
});

saveChangedPriceShopeeItem = (shopee) => {
  const url = `https://shopee.vn/api/v2/item/get?itemid=${shopee.itemid}&shopid=${shopee.shopid}`;
  fetch(url)
    .then((extRes) => extRes.json())
    .then((data) => {
      if (shopee.price_max != data.item.price_max) {
        return saveShopeeItem(data.item);
      }
    });
};

saveShopeeItem = (item) => {
  const shopeeItem = new Shopee({
    itemid: item.itemid,
    shopid: item.shopid,
    name: item.name,
    price_max: item.price_max,
    trackedDate: new Date(),
  });
  shopeeItem.save((err) => {
    if (err) console.error(err);
  });
  return shopeeItem;
};

setInterval(() => {
  Tiki.find({}, (err, tikis) => {
    tikis.forEach((tiki) => {
      saveChangedPriceShopeeItem(tiki);
    });
  });
  Shopee.find({}, (err, shopees) => {
    shopees.forEach((shopee) => {
      saveChangedPriceShopeeItem(shopee);
    });
  });
}, trackingInterval);

app.listen(port, () => console.log(`Listening on port ${port}...`));
