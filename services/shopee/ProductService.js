const ProductOrigin = require("../../constants/ProductOrigin");
const ShopeeRestClient = require("../../clients/ShopeeRestClient");

const NUMBER_OF_DECIMAL_PLACES_IN_PRICE = 100000;
const IMAGES_BASE_URL = "https://cf.shopee.vn/file";

const getProduct = (itemId, shopId) => {
  return ShopeeRestClient.fetchProduct(itemId, shopId).then(async (shopee) => {
    const product = await convertToProductModel(shopee.data);
    product.variants.forEach((variant) => {
      variant.sellers = Array.from(variant.sellers);
    });
    product.sellers = Array.from(product.sellers);
    return product;
  });
};

const convertToProductModel = async (shopeeItem) => {
  const shopeeSeller = await fetchSeller(shopeeItem.shopid);
  const imageUrls = getAllImageUrls(shopeeItem);
  return {
    id: shopeeItem.itemid,
    name: shopeeItem.name,
    thumbnailUrl: `${imageUrls[0]}_tn`,
    imagesUrls: imageUrls,
    origin: ProductOrigin.SHOPEE_VN,
    minPrice: shopeeItem.price_min / NUMBER_OF_DECIMAL_PLACES_IN_PRICE,
    maxPrice: shopeeItem.price_max / NUMBER_OF_DECIMAL_PLACES_IN_PRICE,
    options: shopeeItem.tier_variations.map((variation) => ({
      name: variation.name,
      values: variation.options,
    })),
    variants: getModels(shopeeItem, shopeeSeller),
    sellers: getSellers(shopeeSeller),
    lastTrackedDate: null,
  };
};

const getModels = (shopeeItem, shopeeSeller) => {
  return shopeeItem.models.map((model) => ({
    name: model.name,
    imagesUrls: model.extinfo.tier_index.map((tierIndex, index) => {
      const images = shopeeItem.tier_variations[index].images;
      return images ? images[tierIndex] : images;
    }),
    configurations: model.extinfo.tier_index.map((tierIndex, index) => ({
      option: shopeeItem.tier_variations[index].name,
      value: shopeeItem.tier_variations[index].options[tierIndex],
    })),
    sellers: getModelSellers(shopeeSeller, model.price),
  }));
};

const getModelSellers = (shopeeSeller, price) => {
  const sellers = new Map();
  const shortenedPrice = price / NUMBER_OF_DECIMAL_PLACES_IN_PRICE;
  const currentSeller = {
    priceHistories: [{ price: shortenedPrice, trackedDate: null }],
  };
  sellers.set(shopeeSeller.id.toString(), currentSeller);
  return sellers;
};

const getSellers = (shopeeSeller) => {
  const sellers = new Map();
  const currentSeller = {
    name: shopeeSeller.name,
    logoUrl: shopeeSeller.logoUrl,
  };
  sellers.set(shopeeSeller.id.toString(), currentSeller);
  return sellers;
};

const getAllImageUrls = (item) => {
  const imageUrls = [];
  item.images.forEach((imageHashCode) => {
    imageUrls.push(`${IMAGES_BASE_URL}/${imageHashCode}`);
  });
  return imageUrls;
};

const fetchSeller = (shopId) => {
  return ShopeeRestClient.fetchShop(shopId).then((shop) => {
    const shopData = shop.data;
    return {
      id: shopData.shopid,
      name: shopData.name,
      logoUrl: `${IMAGES_BASE_URL}/${shopData.account.portrait}`,
    };
  });
};

module.exports = {
  getProduct: getProduct,
  getModelSellers: getModelSellers,
  getModels: getModels,
  convertToProductModel: convertToProductModel,
  getAllImageUrls: getAllImageUrls,
  fetchSeller: fetchSeller,
  getSellerMap: getSellers,
};
