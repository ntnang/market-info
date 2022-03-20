const LodashLang = require("lodash/lang");
const ProductOrigin = require("../../constants/ProductOrigin");
const TikiRestClient = require("../../clients/TikiRestClient");

const getProduct = (id) => {
  return TikiRestClient.fetchProduct(id)
    .then(async (item) => {
      let product = convertToProductModel(item);
      if (item.type === "configurable") {
        product = await getConfigurableProductsOtherSellers(item).then(
          (sellerItems) => {
            sellerItems.forEach((sellerItem) => {
              sellerItem.configurable_products.forEach(
                (configurableProduct) => {
                  const sameConfigurationProduct = product.variants.find(
                    (variant) =>
                      LodashLang.isEqual(
                        variant.configurations,
                        getProductConfigurations(
                          configurableProduct,
                          sellerItem.configurable_options
                        )
                      )
                  );
                  if (sameConfigurationProduct) {
                    sameConfigurationProduct.sellers.push({
                      id: configurableProduct.seller.id.toString(),
                      priceHistories: [
                        {
                          price: configurableProduct.price,
                          trackedDate: null,
                        },
                      ],
                    });
                  } else {
                    product.variants.push({
                      id: configurableProduct.id,
                      name: configurableProduct.name,
                      imagesUrls: configurableProduct.images.map(
                        (image) => image.large_url
                      ),
                      configurations: getProductConfigurations(
                        configurableProduct,
                        sellerItem.configurable_options
                      ),
                      sellers: [
                        {
                          id: configurableProduct.seller.id.toString(),
                          priceHistories: [
                            {
                              price: configurableProduct.price,
                              trackedDate: null,
                            },
                          ],
                        },
                      ],
                    });
                  }
                }
              );
            });
            return product;
          }
        );
      }
      return product;
    })
    .then((product) => {
      const allPrices = product.variants.flatMap((variant) =>
        variant.sellers.flatMap((seller) =>
          seller.priceHistories.map((priceHistory) => priceHistory.price)
        )
      );
      product.minPrice = Math.min(...allPrices);
      product.maxPrice = Math.max(...allPrices);
      return product;
    });
};

const convertToProductModel = (item) => {
  return {
    id: item.id,
    name: item.name,
    thumbnailUrl: item.thumbnail_url,
    imagesUrls: item.images.map((image) => image.base_url),
    origin: ProductOrigin.TIKI_VN,
    minPrice: item.price,
    options: getConfigurableOptions(item),
    variants: item.configurable_products
      ? getConfigurableProducts(item)
      : getSimpleProduct(item),
    sellers: getSellersMetadata(item),
    lastTrackedDate: null,
  };
};

const getConfigurableOptions = (item) => {
  return item.configurable_options
    ? item.configurable_options.map((option) => ({
        name: option.name,
        values: option.values.map((value) => value.label),
      }))
    : [];
};

const getSimpleProduct = (item) => {
  return [
    {
      id: item.id,
      name: item.name,
      imagesUrls: [],
      configurations: [],
      sellers: getSellersPrices(item),
    },
  ];
};

const getConfigurableProducts = (item) => {
  return item.configurable_products.map((product) => ({
    id: product.id,
    name: product.name,
    imagesUrls: product.images.map((image) => image.large_url),
    configurations: getProductConfigurations(
      product,
      item.configurable_options
    ),
    sellers: getConfigurableProductsSellers(product),
  }));
};

const getConfigurableProductsSellers = (product) => {
  return [
    {
      id: product.seller.id.toString(),
      priceHistories: [{ price: product.price, trackedDate: null }],
    },
  ];
};

const getConfigurableProductsOtherSellers = (item) => {
  return Promise.all(
    item.other_sellers.map((seller) => {
      return TikiRestClient.fetchConfigurableProducts(
        item.id,
        seller.product_id
      );
    })
  );
};

const getSellersPrices = (item) => {
  const currentSellerPrice = {
    id: item.current_seller.id.toString(),
    priceHistories: [{ price: item.current_seller.price, trackedDate: null }],
  };
  const otherSellerPrices = item.other_sellers.map((seller) => ({
    id: seller.id.toString(),
    priceHistories: [{ price: seller.price, trackedDate: null }],
  }));
  return [...currentSellerPrice, ...otherSellerPrices];
};

const getSellersMetadata = (item) => {
  const currentSellerMetadata = [
    item.current_seller.id.toString(),
    {
      name: item.current_seller.name,
      logoUrl: item.current_seller.logo,
    },
  ];
  const otherSellerMetadata = item.other_sellers.map((seller) => [
    seller.id.toString(),
    {
      name: seller.name,
      logoUrl: seller.logo,
    },
  ]);
  return [...currentSellerMetadata, ...otherSellerMetadata];
};

const getProductConfigurations = (product, options) => {
  const configurations = [];
  options.forEach((option) => {
    configurations.push({ name: option.name, value: product[option.code] });
  });
  return configurations;
};

module.exports = {
  getProduct: getProduct,
  convertToProductModel: convertToProductModel,
  getConfigurableOptions: getConfigurableOptions,
  getSellersPrices: getSellersPrices,
  getSellersMetadata: getSellersMetadata,
  getConfigurableProductsSellers: getConfigurableProductsSellers,
  getConfigurableProducts: getConfigurableProducts,
  getConfigurableProductsOtherSellers: getConfigurableProductsOtherSellers,
  getProductConfigurations: getProductConfigurations,
  getSimpleProduct: getSimpleProduct,
};
