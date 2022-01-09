const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const Product = require("./model/Product");
const PORT = 3001;
const TRACKING_INTERVAL = 3600000; // One hour
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

const TIKI_VN = "tiki.vn";
const SHOPEE_VN = "shopee.vn";

app.get("/api/:origin/product/current-info/:itemId/:shopId?", (req, res) => {
  if (req.params.origin == TIKI_VN) {
    fetchTikiProductData(req.params.itemId).then((tikiProduct) =>
      res.status(305).send(tikiProduct)
    );
  } else if (req.params.origin == SHOPEE_VN) {
    fetchShopeeProductData(req.params.itemId, req.params.shopId).then(
      (shopeeProduct) => res.status(305).send(shopeeProduct)
    );
  } else {
    res.status(404).send("Not supported origin");
  }
});

app.get("/api/:origin/product/history/:itemId", (req, res) => {
  const query = { id: req.params.itemId, origin: req.params.origin };
  Product.findOne(query, (err, product) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    }
    if (product) {
      res
        .status(200)
        .send(convertPersistedProductModelToProductResponse(product));
    } else {
      res.status(404).send();
    }
  });
});

app.get("/api/product/latest/history/", (_, res) => {
  Product.findOne()
    .sort({ lastTrackedDate: -1 })
    .exec((err, lastTrackedProduct) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      }
      if (lastTrackedProduct) {
        res
          .status(200)
          .send(
            convertPersistedProductModelToProductResponse(lastTrackedProduct)
          );
      } else {
        res.status(404).send();
      }
    });
});

app.get("/api/products", (_, res) => {
  Product.find({}, (err, products) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    } else {
      res
        .status(200)
        .send(
          Array.from(products, (product) =>
            convertPersistedProductModelToProductResponse(product)
          )
        );
    }
  });
});

app.post("/api/product/:id", async (req, res) => {
  const query = { id: req.params.id };
  const itemExisted = await Product.exists(query);
  const newProduct = setTrackedDate(req.body);
  if (itemExisted) {
    Product.findOne(query).exec((err, persistedProduct) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      } else {
        const isChanged = updatePriceHistoriesIfChanged(
          newProduct,
          persistedProduct
        );
        res.status(isChanged ? 201 : 200).send();
      }
    });
  } else {
    const product = new Product(newProduct);
    product.save((err) => {
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
      const product = convertTikiItemToProductModel(item);
      product.sellers = Array.from(product.sellers);
      return product;
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
        convertTikiItemToProductModel(item),
        persistedProduct
      );
    });
};

updatePriceHistoriesIfChanged = (newProduct, persistedProduct) => {
  let anySellerPriceChanged = false;
  const currentDateTime = new Date();
  const newSellers = newProduct.sellers;
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
  return anySellerPriceChanged;
};

setTrackedDate = (originalProduct) => {
  const trackedProduct = Object.assign({}, originalProduct);
  const currentDateTime = new Date();
  trackedProduct.lastTrackedDate = currentDateTime;
  const sellersValue = new Map(originalProduct.sellers.value);
  for (let seller of sellersValue.values()) {
    seller.priceHistories[0].trackedDate = currentDateTime;
  }
  trackedProduct.sellers = sellersValue;
  return trackedProduct;
};

convertTikiItemToProductModel = (tikiItem) => {
  return {
    id: tikiItem.id,
    name: tikiItem.name,
    thumbnailUrl: tikiItem.thumbnail_url,
    imagesUrls: getAllTikiImageUrls(tikiItem),
    origin: TIKI_VN,
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
      const product = await convertShopeeItemToProductModel(shopee.data);
      product.sellers = Array.from(product.sellers);
      return product;
    });
};

convertShopeeItemToProductModel = async (shopeeItem) => {
  const shopeeSeller = await fetchShopeeSeller(shopeeItem.shopid);
  const imageUrls = getAllShopeeImageUrls(shopeeItem);
  return {
    id: shopeeItem.itemid,
    name: shopeeItem.name,
    thumbnailUrl: `${imageUrls[0]}_tn`,
    imagesUrls: imageUrls,
    origin: SHOPEE_VN,
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

convertPersistedProductModelToProductResponse = (persistedProduct) => {
  return {
    id: persistedProduct.id,
    name: persistedProduct.name,
    thumbnailUrl: persistedProduct.thumbnailUrl,
    imagesUrls: persistedProduct.imagesUrls,
    origin: persistedProduct.origin,
    sellers: Array.from(persistedProduct.sellers, ([sellerId, seller]) =>
      convertPersistedSellerToSellerResponse(sellerId, seller)
    ),
    lastTrackedDate: persistedProduct.lastTrackedDate,
  };
};

convertPersistedSellerToSellerResponse = (
  persistedSellerId,
  persistedSeller
) => {
  return [
    persistedSellerId,
    {
      name: persistedSeller.name,
      logoUrl: persistedSeller.logoUrl,
      priceHistories: Array.from(
        persistedSeller.priceHistories,
        (priceHistory) =>
          convertPersistedPriceHistoryToPriceHistoryResponse(priceHistory)
      ),
    },
  ];
};

convertPersistedPriceHistoryToPriceHistoryResponse = (
  persistedPriceHistory
) => {
  return {
    price: persistedPriceHistory.price,
    trackedDate: persistedPriceHistory.trackedDate,
  };
};

setInterval(() => {
  console.log("TRACKING...");
  Product.find({}, (err, products) => {
    products.forEach((product) => {
      checkChangedPriceProduct(product);
    });
    if (err) console.error(err);
  });
}, TRACKING_INTERVAL);

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
