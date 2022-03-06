const fetch = require("node-fetch");
const ProductOrigin = require("../constants/ProductOrigin");
const TikiProductService = require("./tiki/ProductService");
const ShopeeProductService = require("./shopee/ProductService");

const fetchProduct = (origin, itemId, shopId) => {
  if (origin == ProductOrigin.TIKI_VN) {
    return TikiProductService.getProduct(itemId);
  } else if (origin == ProductOrigin.SHOPEE_VN) {
    return ShopeeProductService.getProduct(itemId, shopId);
  } else {
    return new Promise((resolve, _) => {
      resolve(null);
    });
  }
};

const checkChangedPriceProduct = (persistedProduct) => {
  const url = `https://tiki.vn/api/v2/products/${persistedProduct.id}`;
  fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  })
    .then((res) => res.json())
    .then((item) => {
      return updatePriceHistories(
        TikiProductService.convertToProductModel(item),
        persistedProduct
      );
    });
};

const updatePriceHistories = (newProduct, persistedProduct) => {
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
      logoUrl: newSeller.logoUrl,
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

// TODO: set tracked dates for configurable products
const setTrackedDate = (originalProduct) => {
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

const convertPersistedProductModelToProductResponse = (persistedProduct) => {
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

const convertPersistedSellerToSellerResponse = (
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

const convertPersistedPriceHistoryToPriceHistoryResponse = (
  persistedPriceHistory
) => {
  return {
    price: persistedPriceHistory.price,
    trackedDate: persistedPriceHistory.trackedDate,
  };
};

module.exports = {
  fetchProduct: fetchProduct,
  checkChangedPriceProduct: checkChangedPriceProduct,
  updatePriceHistories: updatePriceHistories,
  setTrackedDate: setTrackedDate,
  convertPersistedProductModelToProductResponse:
    convertPersistedProductModelToProductResponse,
  convertPersistedSellerToSellerResponse:
    convertPersistedSellerToSellerResponse,
  convertPersistedPriceHistoryToPriceHistoryResponse:
    convertPersistedPriceHistoryToPriceHistoryResponse,
};
