const fetch = require("node-fetch");
const ProductOrigin = require("../../constants/ProductOrigin");

const SHOPEE_NUMBER_OF_DECIMAL_PLACES_IN_PRICE = 100000;

const fetchProduct = (itemId, shopId) => {
  const url = `https://shopee.vn/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
  return fetch(url)
    .then((res) => res.json())
    .then(async (shopee) => {
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
  const shortenedPrice = price / SHOPEE_NUMBER_OF_DECIMAL_PLACES_IN_PRICE;
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
    imageUrls.push(`https://cf.shopee.vn/file/${imageHashCode}`);
  });
  return imageUrls;
};

const fetchSeller = (shopId) => {
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

module.exports = {
  fetchProduct: fetchProduct,
  convertToProductModel: convertToProductModel,
  getAllImageUrls: getAllImageUrls,
  fetchSeller: fetchSeller,
  getSellerMap: getSellerMap,
};
