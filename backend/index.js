const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const ProductHistory = require("./model/product-history");
const { raw } = require("express");
// const Shopee = require("./model/shopee");
const port = 3001;
const trackingInterval = 86400000; // One day

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost/market-info", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const dbConnection = mongoose.connection;
dbConnection.on("error", console.error.bind(console, "connection error:"));
dbConnection.once("open", () => {
  console.log("db connection opened");
});

app.post("/api/product/:id", async (req, res) => {
  const query = { id: req.params.id };
  const itemExisted = await ProductHistory.exists(query);
  const newProductHistory = refineProductHistoryData(req.body);
  if (itemExisted) {
    ProductHistory.findOne(query).exec((err, persistedProductHistory) => {
      updatePriceHistoriesIfChanged(newProductHistory, persistedProductHistory);
      res.status(200);
    });
  } else {
    saveProductHistory(newProductHistory);
    res.status(201);
  }
});

app.get("/api/tiki/history/:id", async (req, res) => {
  const query = { id: req.params.id };
  const itemExisted = await ProductHistory.exists(query);
  if (itemExisted) {
    ProductHistory.find(query, (err, tikis) => {
      res.status(302).send(tikis);
    });
  } else {
    res.status(404).send(tikis);
  }
});

app.get("/api/last-product/history/", (req, res) => {
  ProductHistory.findOne()
    .sort({ lastTrackedDate: -1 })
    .exec((err, lastTrackedProduct) => {
      if (lastTrackedProduct) {
        ProductHistory.findOne({ id: lastTrackedProduct.id }).exec(
          (err, productHistory) => {
            res.status(200).send(productHistory);
          }
        );
      }
    });
});

checkChangedPriceProduct = (persistedItem) => {
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
    ProductHistory.updateOne(lastItem);
  }
  return lastItem;
};

saveProductHistory = (productHistoryData) => {
  const productHistory = new ProductHistory(productHistoryData);
  productHistory.save((err) => {
    if (err) console.error(err);
  });
};

refineProductHistoryData = (rawProductHistoryData) => {
  const refinedProductHistoryData = Object.assign({}, rawProductHistoryData);
  const currentDateTime = new Date();
  refinedProductHistoryData.lastTrackedDate = currentDateTime;
  const sellersValue = new Map(rawProductHistoryData.sellers.value);
  for (let seller of sellersValue.values()) {
    seller.priceHistories[0].trackedDate = currentDateTime;
  }
  refinedProductHistoryData.sellers = sellersValue;
  return refinedProductHistoryData;
};

app.get("/api/shopee/get/:itemId/:shopId", (req, res) => {
  const url = `https://shopee.vn/api/v2/item/get?itemid=${req.params.itemId}&shopid=${req.params.shopId}`;
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      res.status(200).send(data);
    });
});

// app.get("/api/shopee/track/:itemId/:shopId", async (req, res) => {
//   const query = { itemid: req.params.itemId, shopid: req.params.shopId };
//   const itemExisted = await Shopee.exists(query);
//   if (itemExisted) {
//     Shopee.findOne(query)
//       .sort({ trackedDate: -1 })
//       .exec((err, shopee) => {
//         const changedItem = saveChangedPriceShopeeItem(shopee);
//         res.status(200).send(changedItem);
//       });
//   } else {
//     const url = `https://shopee.vn/api/v2/item/get?itemid=${req.params.itemId}&shopid=${req.params.shopId}`;
//     fetch(url)
//       .then((extRes) => extRes.json())
//       .then((data) => {
//         res.status(201).send(saveShopeeItem(data.item));
//       });
//   }
// });

// saveChangedPriceShopeeItem = (shopee) => {
//   const url = `https://shopee.vn/api/v2/item/get?itemid=${shopee.itemid}&shopid=${shopee.shopid}`;
//   fetch(url)
//     .then((extRes) => extRes.json())
//     .then((data) => {
//       if (shopee.price_max !== data.item.price_max) {
//         return saveShopeeItem(data.item);
//       }
//     });
// };

// saveShopeeItem = (item) => {
//   const shopeeItem = new Shopee({
//     itemid: item.itemid,
//     shopid: item.shopid,
//     name: item.name,
//     price_max: item.price_max,
//     trackedDate: new Date(),
//   });
//   shopeeItem.save((err) => {
//     if (err) console.error(err);
//   });
//   return shopeeItem;
// };

setInterval(() => {
  ProductHistory.find({}, (err, productHistories) => {
    productHistories.forEach((productHistory) => {
      checkChangedPriceProduct(productHistory);
    });
  });
  // Shopee.find({}, (err, shopees) => {
  //   shopees.forEach((shopee) => {
  //     saveChangedPriceShopeeItem(shopee);
  //   });
  // });
}, trackingInterval);

app.listen(port, () => console.log(`Listening on port ${port}...`));
