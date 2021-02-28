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
    Tiki.findOne(query).exec((err, tiki) => {
      const changedItem = checkChangedPriceTikiItem(tiki);
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
    .sort({ lastTrackedDate: -1 })
    .exec((err, lastTrackedProduct) => {
      if (lastTrackedProduct) {
        Tiki.findOne({ id: lastTrackedProduct.id }).exec((err, tikis) => {
          res.status(200).send(tikis);
        });
      }
    });
});

checkChangedPriceTikiItem = (persistedItem) => {
  const url = `https://tiki.vn/api/v2/products/${persistedItem.id}`;
  fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  })
    .then((res) => res.json())
    .then((beingCheckedItem) => {
      return updatePriceHistoriesIfChanged(beingCheckedItem, persistedItem);
    });
};

updatePriceHistoriesIfChanged = (newItem, lastItem) => {
  let anySellerPriceChanged = false;
  const currentDateTime = new Date();
  const newItemSellers = [newItem.current_seller, ...newItem.other_sellers];
  const lastItemSellers = lastItem.sellers;
  const lastItemSellerIds = [...lastItemSellers.keys()];
  const ongoingSellers = newItemSellers.filter((seller) =>
    lastItemSellerIds.includes(seller.id.toString())
  );
  const openSellers = newItemSellers.filter(
    (seller) => !lastItemSellerIds.includes(seller.id.toString())
  );
  const closedSellers = lastItemSellerIds.filter(
    (sellerId) =>
      !newItemSellers.map((seller) => seller.id.toString()).includes(sellerId)
  );

  ongoingSellers.forEach((seller) => {
    const priceHistories = lastItemSellers.get(seller.id.toString())
      .priceHistories;
    const lastTrack = priceHistories[priceHistories.length - 1];
    if (seller.price !== lastTrack.price) {
      priceHistories.push({
        price: seller.price,
        trackedDate: currentDateTime,
      });
      anySellerPriceChanged = true;
    }
  });
  openSellers.forEach((seller) => {
    lastItemSellers.set(seller.id, {
      storeId: seller.store_id,
      name: seller.name,
      slug: seller.slug,
      sku: seller.sku,
      logo: seller.logo,
      productId: seller.product_id,
      priceHistories: [{ price: seller.price, trackedDate: currentDateTime }],
    });
  });
  closedSellers.forEach((sellerId) => {
    lastItemSellers.get(sellerId).priceHistories.push({
      price: null,
      trackedDate: currentDateTime,
    });
  });
  if (
    anySellerPriceChanged ||
    openSellers.length > 0 ||
    closedSellers.length > 0
  ) {
    lastItem.lastTrackedDate = currentDateTime;
    Tiki.updateOne(lastItem);
  }
  return lastItem;
};

saveTikiItem = (item) => {
  const currentDateTime = new Date();
  const tikiItem = new Tiki({
    id: item.id,
    name: item.name,
    thumbnail_url: item.thumbnail_url,
    sellers: getAllTikiSellers(item, currentDateTime),
    lastTrackedDate: currentDateTime,
  });
  tikiItem.save((err) => {
    if (err) console.error(err);
  });
  return tikiItem;
};

getAllTikiSellers = (item, currentDateTime) => {
  const sellers = new Map();
  const currentSeller = {
    storeId: item.current_seller.store_id,
    name: item.current_seller.name,
    slug: item.current_seller.slug,
    sku: item.current_seller.sku,
    logo: item.current_seller.logo,
    productId: item.current_seller.product_id,
    priceHistories: [
      { price: item.current_seller.price, trackedDate: currentDateTime },
    ],
  };
  sellers.set(item.current_seller.id.toString(), currentSeller);
  item.other_sellers.forEach((seller) => {
    const otherSeller = {
      storeId: seller.store_id,
      name: seller.name,
      slug: seller.slug,
      sku: seller.sku,
      logo: seller.logo,
      productId: seller.product_id,
      priceHistories: [{ price: seller.price, trackedDate: currentDateTime }],
    };
    sellers.set(seller.id.toString(), otherSeller);
  });
  return sellers;
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
      if (shopee.price_max !== data.item.price_max) {
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
