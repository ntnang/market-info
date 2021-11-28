const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const ProductHistory = require("./model/product-history");
const PORT = 3001;
const TRACKING_INTERVAL = 86400000; // One day
const SHOPEE_NUMBER_OF_DECIMAL_PLACES_IN_PRICE = 100000;

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

app.get("/api/:origin/product/:itemId/:shopId?", (req, res) => {
  if (req.params.origin == "tiki.vn") {
    fetchTikiProductData(req.params.itemId).then((tikiProduct) =>
      res.status(305).send(tikiProduct)
    );
  } else if (req.params.origin == "shopee.vn") {
    fetchShopeeProductData(req.params.itemId, req.params.shopId).then(
      (shopeeProduct) => res.status(305).send(shopeeProduct)
    );
  } else {
    res.status(404).send("Not supported origin");
  }
});

app.get("/api/last-product/history/", (req, res) => {
  ProductHistory.findOne()
    .sort({ lastTrackedDate: -1 })
    .exec((err, lastTrackedProduct) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      }
      if (lastTrackedProduct) {
        res.status(200).send(lastTrackedProduct);
      } else {
        res.status(404).send();
      }
    });
});

app.get("/api/products", (req, res) => {
  ProductHistory.find({}, (err, productHistories) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    } else {
      res.status(200).send(productHistories);
    }
  });
});

app.post("/api/product/:id", async (req, res) => {
  const query = { id: req.params.id };
  const itemExisted = await ProductHistory.exists(query);
  const newProductHistory = refineProductHistoryData(req.body);
  if (itemExisted) {
    ProductHistory.findOne(query).exec((err, persistedProductHistory) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      } else {
        updatePriceHistoriesIfChanged(
          newProductHistory,
          persistedProductHistory
        );
        res.status(200).send();
      }
    });
  } else {
    const productHistory = new ProductHistory(newProductHistory);
    productHistory.save((err) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      }
      res.status(201).send();
    });
  }
});

fetchTikiProductData = (id) => {
  const url = `https://tiki.vn/api/v2/products/${id}`;
  return fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  })
    .then((res) => res.json())
    .then((item) => {
      const productHistory = convertTikiItemToProductHistoryModel(item);
      productHistory.sellers = Array.from(productHistory.sellers);
      return productHistory;
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
        price: newPriceHistory.price,
        trackedDate: currentDateTime,
      });
      anySellerPriceChanged = true;
    }
  });
  openSellerIds.forEach((sellerId) => {
    const newSeller = newSellers.get(sellerId);
    persistedProductSellers.set(sellerId, {
      name: newSeller.name,
      logoUrl: newSeller.logo,
      priceHistories: [
        {
          price: newSeller.priceHistories[0].price,
          trackedDate: currentDateTime,
        },
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
    persistedProduct.save();
  }
  return persistedProduct;
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
    name: item.current_seller.name,
    logoUrl: item.current_seller.logo,
    priceHistories: [{ price: item.current_seller.price, trackedDate: null }],
  };
  sellers.set(item.current_seller.id.toString(), currentSeller);
  item.other_sellers.forEach((seller) => {
    const otherSeller = {
      name: seller.name,
      logoUrl: seller.logo,
      priceHistories: [{ price: seller.price, trackedDate: null }],
    };
    sellers.set(seller.id.toString(), otherSeller);
  });
  return sellers;
};

fetchShopeeProductData = (itemId, shopId) => {
  const url = `https://shopee.vn/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
  return fetch(url)
    .then((res) => res.json())
    .then(async (shopee) => {
      const productHistory = await convertShopeeItemToProductHistoryModel(
        shopee.data
      );
      productHistory.sellers = Array.from(productHistory.sellers);
      return productHistory;
    });
};

convertShopeeItemToProductHistoryModel = async (shopeeItem) => {
  const shopeeSeller = await fetchShopeeSeller(shopeeItem.shopid);
  return {
    id: shopeeItem.itemid,
    name: shopeeItem.name,
    imagesUrls: getAllShopeeImageUrls(shopeeItem),
    origin: "shopee",
    sellers: getShopeeSellerMap(shopeeSeller, shopeeItem.price_max),
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

fetchShopeeSeller = (shopId) => {
  const url = `https://shopee.vn/api/v4/product/get_shop_info?shopid=${shopId}`;
  return fetch(url)
    .then((res) => res.json())
    .then((shop) => {
      const shopData = shop.data;
      return {
        id: shopData.shopid,
        name: shopData.name,
        logoUrl: `https://cf.shopee.vn/file/${shopData.account.portrait}`,
      };
    });
};

getShopeeSellerMap = (shopeeSeller, price) => {
  const sellers = new Map();
  const shortenedPrice = price / SHOPEE_NUMBER_OF_DECIMAL_PLACES_IN_PRICE;
  const currentSeller = {
    name: shopeeSeller.name,
    logoUrl: shopeeSeller.logoUrl,
    priceHistories: [{ price: shortenedPrice, trackedDate: null }],
  };
  sellers.set(shopeeSeller.id.toString(), currentSeller);
  return sellers;
};

setInterval(() => {
  console.log("TRACKING...");
  ProductHistory.find({}, (err, productHistories) => {
    productHistories.forEach((productHistory) => {
      checkChangedPriceProduct(productHistory);
    });
    if (err) console.error(err);
  });
}, TRACKING_INTERVAL);

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
