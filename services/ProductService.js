const fetch = require("node-fetch");

const SHOPEE_NUMBER_OF_DECIMAL_PLACES_IN_PRICE = 100000;
const fetchTikiProductData = (id) => {
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

const checkChangedPriceProduct = (persistedProduct) => {
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

const updatePriceHistoriesIfChanged = (newProduct, persistedProduct) => {
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
      logo: { url: newSeller.logo },
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

const convertTikiItemToProductModel = (tikiItem) => {
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

const getAllTikiImageUrls = (item) => {
  const imageUrls = [];
  item.images.forEach((image) => {
    imageUrls.push(image.base_url);
  });
  return imageUrls;
};

const getAllTikiSellers = (item) => {
  const sellers = new Map();
  const currentSeller = {
    name: item.current_seller.name,
    logo: { url: item.current_seller.logo },
    priceHistories: [{ price: item.current_seller.price, trackedDate: null }],
  };
  sellers.set(item.current_seller.id.toString(), currentSeller);
  item.other_sellers.forEach((seller) => {
    const otherSeller = {
      name: seller.name,
      logo: { url: seller.logo },
      priceHistories: [{ price: seller.price, trackedDate: null }],
    };
    sellers.set(seller.id.toString(), otherSeller);
  });
  return sellers;
};

const fetchShopeeProductData = (itemId, shopId) => {
  const url = `https://shopee.vn/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
  return fetch(url)
    .then((res) => res.json())
    .then(async (shopee) => {
      const product = await convertShopeeItemToProductModel(shopee.data);
      product.sellers = Array.from(product.sellers);
      return product;
    });
};

const convertShopeeItemToProductModel = async (shopeeItem) => {
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

const getAllShopeeImageUrls = (item) => {
  const imageUrls = [];
  item.images.forEach((imageHashCode) => {
    imageUrls.push(`https://cf.shopee.vn/file/${imageHashCode}`);
  });
  return imageUrls;
};

const fetchShopeeSeller = (shopId) => {
  const url = `https://shopee.vn/api/v4/product/get_shop_info?shopid=${shopId}`;
  return fetch(url)
    .then((res) => res.json())
    .then((shop) => {
      const shopData = shop.data;
      return {
        id: shopData.shopid,
        name: shopData.name,
        logo: { url: `https://cf.shopee.vn/file/${shopData.account.portrait}` },
      };
    });
};

const getShopeeSellerMap = (shopeeSeller, price) => {
  const sellers = new Map();
  const shortenedPrice = price / SHOPEE_NUMBER_OF_DECIMAL_PLACES_IN_PRICE;
  const currentSeller = {
    name: shopeeSeller.name,
    logo: { url: shopeeSeller.logoUrl },
    priceHistories: [{ price: shortenedPrice, trackedDate: null }],
  };
  sellers.set(shopeeSeller.id.toString(), currentSeller);
  return sellers;
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
      logo: { url: persistedSeller.logo.url },
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
  fetchTikiProductData: fetchTikiProductData,
  checkChangedPriceProduct: checkChangedPriceProduct,
  updatePriceHistoriesIfChanged: updatePriceHistoriesIfChanged,
  setTrackedDate: setTrackedDate,
  convertTikiItemToProductModel: convertTikiItemToProductModel,
  getAllTikiImageUrls: getAllTikiImageUrls,
  getAllTikiSellers: getAllTikiSellers,
  fetchShopeeProductData: fetchShopeeProductData,
  convertShopeeItemToProductModel: convertShopeeItemToProductModel,
  getAllShopeeImageUrls: getAllShopeeImageUrls,
  fetchShopeeSeller: fetchShopeeSeller,
  getShopeeSellerMap: getShopeeSellerMap,
  convertPersistedProductModelToProductResponse:
    convertPersistedProductModelToProductResponse,
  convertPersistedSellerToSellerResponse:
    convertPersistedSellerToSellerResponse,
  convertPersistedPriceHistoryToPriceHistoryResponse:
    convertPersistedPriceHistoryToPriceHistoryResponse,
};
