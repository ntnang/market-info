const fetch = require("node-fetch");
const ProductOrigin = require("../../constants/ProductOrigin");
const ShopeeRestClient = require("../../clients/ShopeeRestClient");

const NUMBER_OF_DECIMAL_PLACES_IN_PRICE = 100000;
const IMAGES_BASE_URL = "https://cf.shopee.vn/file";

const getProduct = (itemId, shopId) => {
  return ShopeeRestClient.fetchProduct(itemId, shopId).then(async (shopee) => {
    const product = await convertToProductModel(shopee.data);
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
    sellers: getSellerMap(shopeeSeller, shopeeItem.price_max),
    lastTrackedDate: null,
  };
};

const getSellerMap = (shopeeSeller, price) => {
  const sellers = new Map();
  const shortenedPrice = price / NUMBER_OF_DECIMAL_PLACES_IN_PRICE;
  const currentSeller = {
    name: shopeeSeller.name,
    logoUrl: shopeeSeller.logoUrl,
    priceHistories: [{ price: shortenedPrice, trackedDate: null }],
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
  convertToProductModel: convertToProductModel,
  getAllImageUrls: getAllImageUrls,
  fetchSeller: fetchSeller,
  getSellerMap: getSellerMap,
};
