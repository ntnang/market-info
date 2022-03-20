const ProductOrigin = require("../../constants/ProductOrigin");
const ShopeeRestClient = require("../../clients/ShopeeRestClient");

const NUMBER_OF_DECIMAL_PLACES_IN_PRICE = 100000;
const IMAGES_BASE_URL = "https://cf.shopee.vn/file";

const getProduct = (itemId, shopId) => {
  return ShopeeRestClient.fetchProduct(itemId, shopId).then(async (shopee) => {
    return await convertToProductModel(shopee.data);
  });
};

const convertToProductModel = async (shopeeItem) => {
  const shopeeSeller = await fetchSeller(shopeeItem.shopid);
  return {
    id: shopeeItem.itemid,
    name: shopeeItem.name,
    thumbnailUrl: `${IMAGES_BASE_URL}/${shopeeItem.images[0]}_tn`,
    imagesUrls: shopeeItem.images.map((image) => `${IMAGES_BASE_URL}/${image}`),
    origin: ProductOrigin.SHOPEE_VN,
    minPrice: shopeeItem.price_min / NUMBER_OF_DECIMAL_PLACES_IN_PRICE,
    maxPrice: shopeeItem.price_max / NUMBER_OF_DECIMAL_PLACES_IN_PRICE,
    options: getVariations(shopeeItem),
    variants: getModels(shopeeItem, shopeeSeller),
    sellers: getSellers(shopeeSeller),
    lastTrackedDate: null,
  };
};

const getVariations = (shopeeItem) => {
  return shopeeItem.tier_variations.map((variation) => ({
    name: variation.name,
    values: variation.options,
  }));
};

const getModels = (shopeeItem, shopeeSeller) => {
  return shopeeItem.models.map((model) => ({
    id: model.modelid,
    name: model.name,
    imagesUrls: getModelImagesUrls(shopeeItem, model),
    configurations: model.extinfo.tier_index.map((tierIndex, index) => ({
      option: shopeeItem.tier_variations[index].name,
      value: shopeeItem.tier_variations[index].options[tierIndex],
    })),
    sellers: getModelSellerPrices(shopeeSeller, model.price),
  }));
};

const getModelImagesUrls = (shopeeItem, model) => {
  return model.extinfo.tier_index.flatMap((tierIndex, index) => {
    const variationImages = shopeeItem.tier_variations[index].images;
    const images = variationImages ? [variationImages[tierIndex]] : [];
    return images.map((image) => `${IMAGES_BASE_URL}/${image}`);
  });
};

const getModelSellerPrices = (shopeeSeller, modelPrice) => {
  return [
    {
      id: shopeeSeller.id.toString(),
      priceHistories: [
        {
          price: modelPrice / NUMBER_OF_DECIMAL_PLACES_IN_PRICE,
          trackedDate: null,
        },
      ],
    },
  ];
};

const getSellers = (shopeeSeller) => {
  return [
    {
      id: shopeeSeller.id.toString(),
      name: shopeeSeller.name,
      logoUrl: shopeeSeller.logoUrl,
    },
  ];
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
  getVariations: getVariations,
  getModels: getModels,
  getModelImagesUrls: getModelImagesUrls,
  getModelSellerPrices: getModelSellerPrices,
  convertToProductModel: convertToProductModel,
  fetchSeller: fetchSeller,
  getSellerMap: getSellers,
};
