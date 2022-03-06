const fetch = require("node-fetch");

const BASE_URL = "https://shopee.vn/api/v4";

const fetchProduct = (itemId, shopId) => {
  const url = `${BASE_URL}/item/get?itemid=${itemId}&shopid=${shopId}`;
  return fetch(url).then((res) => res.json());
};

const fetchShop = (shopId) => {
  const url = `${BASE_URL}/product/get_shop_info?shopid=${shopId}`;
  return fetch(url).then((res) => res.json());
};

module.exports = {
  fetchProduct: fetchProduct,
  fetchShop: fetchShop,
};
