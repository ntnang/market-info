const fetch = require("node-fetch");
const LodashLang = require("lodash/lang");
const ProductOrigin = require("../../constants/ProductOrigin");

const fetchProduct = (id) => {
  const url = `https://tiki.vn/api/v2/products/${id}`;
  return fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  })
    .then((res) => res.json())
    .then(async (item) => {
      let product = convertToProductModel(item);
      product = await getConfigurableProductsOtherSellers(item).then(
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
      product.variants.forEach((variant) => {
        variant.sellers = Array.from(variant.sellers);
      });
      product.variants = Array.from(product.variants);
      product.sellers = Array.from(product.sellers);
      return product;
    });
};

const convertToProductModel = (tikiItem) => {
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
    variants: getConfigurableProducts(tikiItem),
    sellers: getSellers(tikiItem),
    lastTrackedDate: null,
  };
};

const getConfigurableProducts = (tikiItem) => {
  const products = new Map();
  tikiItem.configurable_products.forEach((product) => {
    products.set(product.id, {
      name: product.name,
      imagesUrls: product.images.map((image) => image.large_url),
      configurations: getProductConfigurations(
        product,
        tikiItem.configurable_options
      ),
      sellers: getConfigurableProductsSellers(product),
    });
  });
  return products;
};

const getConfigurableProductsSellers = (product) => {
  const sellers = new Map();
  sellers.set(product.seller.id.toString(), {
    priceHistories: [{ price: product.price, trackedDate: null }],
  });
  return sellers;
};

const getConfigurableProductsOtherSellers = (item) => {
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

const getSellers = (item) => {
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

const getProductConfigurations = (product, options) => {
  const configurations = [];
  options.forEach((option) => {
    configurations.push({ name: option.name, value: product[option.code] });
  });
  return configurations;
};

module.exports = {
  fetchProduct: fetchProduct,
  convertToProductModel: convertToProductModel,
  getSellers: getSellers,
  getConfigurableProductsSellers: getConfigurableProductsSellers,
  getConfigurableProducts: getConfigurableProducts,
  getConfigurableProductsOtherSellers: getConfigurableProductsOtherSellers,
  getProductConfigurations: getProductConfigurations,
};
