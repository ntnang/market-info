const fetch = require("node-fetch");

const BASE_URL = "https://tiki.vn/api/v2";

const fetchProduct = (id) => {
  const url = `${BASE_URL}/products/${id}`;
  return fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  }).then((res) => res.json());
};

const fetchConfigurableProducts = (id, spid) => {
  const url = `${BASE_URL}/products/${id}?spid=${spid}`;
  return fetch(url, {
    headers: {
      "User-Agent": "", // tiki requires user-agent header, without it we'll get 404
    },
  }).then((res) => res.json());
};

module.exports = {
  fetchProduct: fetchProduct,
  fetchConfigurableProducts: fetchConfigurableProducts,
};
