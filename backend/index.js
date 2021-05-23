const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const ProductHistory = require("./model/product-history");
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

app.get("/api/:origin/product/history/:itemId/:shopId?", async (req, res) => {
  const query = { id: req.params.itemId, origin: req.params.origin };
  const itemExisted = await ProductHistory.exists(query);
  if (itemExisted) {
    ProductHistory.findOne(query, (err, productHistory) => {
      res.status(302).send(productHistory);
    });
  } else if (req.params.origin == "tiki") {
    fetchTikiProductData(req.params.itemId);
  } else if (req.params.origin == "shopee") {
    fetchShopeeProductData(req.params.itemId, req.params.shopId);
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

fetchTikiProductData = (id) => {
  const url = `https://tiki.vn/api/v2/products/${id}`;
  fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  })
    .then((res) => res.json())
    .then((item) => {
      const productHistory = convertTikiItemToProductHistoryModel(item);
      productHistory.sellers = Array.from(productHistory.sellers);
      res.status(305).send(productHistory);
    });
};

checkChangedPriceProduct = (persistedProduct) => {
  const url = `https://tiki.vn/api/v2/products/${persistedProduct.id}`;
  fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  })
    .then((res) => res.json())
    .then((item) => {
      return updatePriceHistoriesIfChanged(
        convertTikiItemToProductHistoryModel(item),
        persistedProduct
      );
    });
};

updatePriceHistoriesIfChanged = (newProductHistory, persistedProduct) => {
  let anySellerPriceChanged = false;
  const currentDateTime = new Date();
  const newSellers = newProductHistory.sellers;
  const newSellerIds = Array.from(newSellers.keys());
  const persistedProductSellers = persistedProduct.sellers;
  const persistedProductSellerIds = [...persistedProductSellers.keys()];
  const ongoingSellerIds = newSellerIds.filter((sellerId) =>
    persistedProductSellerIds.includes(sellerId)
  );
  const openSellerIds = newSellerIds.filter(
    (sellerId) => !persistedProductSellerIds.includes(sellerId)
  );
  const closedSellerIds = persistedProductSellerIds.filter(
    (sellerId) => !newSellerIds.includes(sellerId)
  );

  ongoingSellerIds.forEach((sellerId) => {
    const priceHistories = persistedProductSellers.get(sellerId).priceHistories;
    const lastPriceHistory = priceHistories[priceHistories.length - 1];
    const newPriceHistory = newSellers.get(sellerId).priceHistories[0];
    if (newPriceHistory.price !== lastPriceHistory.price) {
      priceHistories.push({
        price: seller.price,
        trackedDate: currentDateTime,
      });
      anySellerPriceChanged = true;
    }
  });
  openSellerIds.forEach((sellerId) => {
    const newSeller = newSellers.get(sellerId);
    persistedProductSellers.set(sellerId, {
      storeId: newSeller.store_id,
      name: newSeller.name,
      slug: newSeller.slug,
      sku: newSeller.sku,
      logo: newSeller.logo,
      productId: newSeller.product_id,
      priceHistories: [
        { price: newSeller.price, trackedDate: currentDateTime },
      ],
    });
  });
  closedSellerIds.forEach((sellerId) => {
    persistedProductSellers.get(sellerId).priceHistories.push({
      price: null,
      trackedDate: currentDateTime,
    });
  });
  if (
    anySellerPriceChanged ||
    openSellerIds.length > 0 ||
    closedSellerIds.length > 0
  ) {
    persistedProduct.lastTrackedDate = currentDateTime;
    ProductHistory.updateOne(persistedProduct);
  }
  return persistedProduct;
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

convertTikiItemToProductHistoryModel = (tikiItem) => {
  return {
    id: tikiItem.id,
    name: tikiItem.name,
    imagesUrls: getAllTikiImageUrls(tikiItem),
    origin: "tiki",
    sellers: getAllTikiSellers(tikiItem),
    lastTrackedDate: null,
  };
};

getAllTikiImageUrls = (item) => {
  const imageUrls = [];
  item.images.forEach((image) => {
    imageUrls.push(image.base_url);
  });
  return imageUrls;
};

getAllTikiSellers = (item) => {
  const sellers = new Map();
  const currentSeller = {
    storeId: item.current_seller.store_id,
    name: item.current_seller.name,
    logoUrl: item.current_seller.logo,
    productId: item.current_seller.product_id,
    priceHistories: [{ price: item.current_seller.price, trackedDate: null }],
  };
  sellers.set(item.current_seller.id.toString(), currentSeller);
  item.other_sellers.forEach((seller) => {
    const otherSeller = {
      storeId: seller.store_id,
      name: seller.name,
      logoUrl: seller.logo,
      productId: seller.product_id,
      priceHistories: [{ price: seller.price, trackedDate: null }],
    };
    sellers.set(seller.id.toString(), otherSeller);
  });
  return sellers;
};

fetchShopeeProductData = (itemId, shopId) => {
  const url = `https://shopee.vn/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`;
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      res.status(200).send(data);
    });
};

convertShopeeItemToProductHistoryModel = (shopeeItem) => {
  return {
    id: shopeeItem.itemid,
    name: shopeeItem.name,
    imagesUrls: getAllShopeeImageUrls(shopeeItem),
    origin: "shopee",
    sellers: getAllShopeeSellers(shopeeItem),
    lastTrackedDate: null,
  };
};

getAllShopeeImageUrls = (item) => {
  const imageUrls = [];
  item.images.forEach((imageHashCode) => {
    imageUrls.push(`https://cf.shopee.vn/file/${imageHashCode}`);
  });
  return imageUrls;
};

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
