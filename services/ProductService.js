const fetch = require("node-fetch");
const LodashLang = require("lodash/lang");
const ProductOrigin = require("../constants/ProductOrigin");

const SHOPEE_NUMBER_OF_DECIMAL_PLACES_IN_PRICE = 100000;
const fetchTikiProductData = (id) => {
  const url = `https://tiki.vn/api/v2/products/${id}`;
  return fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  })
    .then((res) => res.json())
    .then(async (item) => {
      let product = convertTikiItemToProductModel(item);
      product = await getTikiConfigurableProductsOtherSellers(item).then(
        (subItems) => {
          subItems.forEach((subItem) => {
            subItem.configurable_products.forEach((configurableProduct) => {
              const sameConfigurationProduct = Array.from(
                product.variants.values()
              ).find((variant) =>
                LodashLang.isEqual(
                  variant.configurations,
                  getProductConfigurations(
                    configurableProduct,
                    subItem.configurable_options
                  )
                )
              );
              if (sameConfigurationProduct) {
                sameConfigurationProduct.sellers.set(
                  configurableProduct.seller.id.toString(),
                  {
                    priceHistories: [
                      { price: configurableProduct.price, trackedDate: null },
                    ],
                  }
                );
              } else {
                product.variants.push([
                  configurableProduct.id,
                  {
                    name: configurableProduct.name,
                    imagesUrls: configurableProduct.images.map(
                      (image) => image.large_url
                    ),
                    configurations: getProductConfigurations(
                      configurableProduct,
                      subItem.configurable_options
                    ),
                    sellers: new Map().set(
                      configurableProduct.seller.id.toString(),
                      {
                        priceHistories: [
                          {
                            price: configurableProduct.price,
                            trackedDate: null,
                          },
                        ],
                      }
                    ),
                  },
                ]);
              }
            });
          });
          return product;
        }
      );
      return product;
    })
    .then((product) => {
      // console.log("--------------------------------");
      // console.log(product);
      product.variants.forEach((variant) => {
        variant.sellers = Array.from(variant.sellers);
      });
      product.variants = Array.from(product.variants);
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
      return updatePriceHistories(
        convertTikiItemToProductModel(item),
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
    imagesUrls: tikiItem.images.map((image) => image.base_url),
    origin: ProductOrigin.TIKI_VN,
    minPrice: tikiItem.price,
    options: tikiItem.configurable_options.map((option) => ({
      name: option.name,
      values: option.values,
    })),
    variants: getTikiItemConfigurableProducts(tikiItem),
    sellers: getTikiSellers(tikiItem),
    lastTrackedDate: null,
  };
};

const getTikiItemConfigurableProducts = (tikiItem) => {
  const products = new Map();
  tikiItem.configurable_products.forEach((product) => {
    products.set(product.id, {
      name: product.name,
      imagesUrls: product.images.map((image) => image.large_url),
      configurations: getProductConfigurations(
        product,
        tikiItem.configurable_options
      ),
      sellers: getTikiConfigurableProductsSellers(product),
    });
  });
  return products;
};

const getProductConfigurations = (product, options) => {
  const configurations = [];
  options.forEach((option) => {
    configurations.push({ name: option.name, value: product[option.code] });
  });
  return configurations;
};

const getTikiConfigurableProductsSellers = (product) => {
  const sellers = new Map();
  sellers.set(product.seller.id.toString(), {
    priceHistories: [{ price: product.price, trackedDate: null }],
  });
  return sellers;
};

const getTikiConfigurableProductsOtherSellers = (item) => {
  return Promise.all(
    item.other_sellers.map((seller) => {
      const url = `https://tiki.vn/api/v2/products/${item.id}?spid=${seller.product_id}`;
      return fetch(url, {
        headers: {
          "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
        },
      }).then((res) => res.json());
    })
  );
};

const getTikiSellers = (item) => {
  const sellers = new Map();
  const currentSeller = {
    name: item.current_seller.name,
    logoUrl: item.current_seller.logo,
    priceHistories:
      item.type === "simple"
        ? [{ price: item.current_seller.price, trackedDate: null }]
        : null,
  };
  sellers.set(item.current_seller.id.toString(), currentSeller);
  item.other_sellers.forEach((seller) => {
    const otherSeller = {
      name: seller.name,
      logoUrl: seller.logo,
      priceHistories:
        item.type === "simple"
          ? [{ price: seller.price, trackedDate: null }]
          : null,
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
    origin: ProductOrigin.SHOPEE_VN,
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
        logoUrl: `https://cf.shopee.vn/file/${shopData.account.portrait}`,
      };
    });
};

const getShopeeSellerMap = (shopeeSeller, price) => {
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
  fetchTikiProductData: fetchTikiProductData,
  checkChangedPriceProduct: checkChangedPriceProduct,
  updatePriceHistoriesIfChanged: updatePriceHistories,
  setTrackedDate: setTrackedDate,
  convertTikiItemToProductModel: convertTikiItemToProductModel,
  getTikiSellers: getTikiSellers,
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
  getProductConfigurations: getProductConfigurations,
  getTikiConfigurableProductsSellers: getTikiConfigurableProductsSellers,
  getTikiItemConfigurableProducts: getTikiItemConfigurableProducts,
  getTikiConfigurableProductsOtherSellers:
    getTikiConfigurableProductsOtherSellers,
};
