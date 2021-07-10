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
    fetchTikiProductData(req.params.itemId).then((tikiProductHistory) =>
      res.status(305).send(tikiProductHistory)
    );
  } else if (req.params.origin == "shopee") {
    fetchShopeeProductData(req.params.itemId, req.params.shopId).then(
      (shopeeProductHistory) => res.status(305).send(shopeeProductHistory)
    );
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
  const url = `https://shopee.vn/api/v2/item/get?itemid=${itemId}&shopid=${shopId}`;
  return fetch(url)
    .then((res) => res.json())
    .then((item) => {
      const productHistory = convertShopeeItemToProductHistoryModel(item);
      productHistory.sellers = Array.from(productHistory.sellers);
      return productHistory;
    });
};

convertShopeeItemToProductHistoryModel = (shopeeItem) => {
  return {
    id: shopeeItem.itemid,
    name: shopeeItem.name,
    imagesUrls: getAllShopeeImageUrls(shopeeItem),
    origin: "shopee",
    sellers: getShopeeSellerMap(
      fetchShopeeSeller(shopeeItem.shopId),
      shopeeItem.price_max
    ),
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

fetchShopeeSeller = async (shopId) => {
  const url = `https://shopee.vn/api/v4/product/get_shop_info?shopid=${shopId}`;
  return await fetch(url)
    .then((res) => res.json())
    .then((shop) => {
      return {
        id: shop.shopid,
        name: shop.name,
        logoUrl: `https://cf.shopee.vn/file/${shop.account.portrait}`,
      };
    });
};

getShopeeSellerMap = (shopeeSeller, price) => {
  const sellers = new Map();
  const currentSeller = {
    name: shopeeSeller.name,
    logoUrl: shopeeSeller.logo.logoUrl,
    priceHistories: [{ price: price, trackedDate: null }],
  };
  sellers.set(shopeeSeller.id, currentSeller);
};

setInterval(() => {
  ProductHistory.find({}, (err, productHistories) => {
    productHistories.forEach((productHistory) => {
      checkChangedPriceProduct(productHistory);
    });
  });
}, trackingInterval);

app.listen(port, () => console.log(`Listening on port ${port}...`));
