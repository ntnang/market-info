export class ProductService {
  getAllProducts() {
    return fetch("http://localhost:3001/api/products").then((res) =>
      res.json()
    );
  }

  getProductInformation(origin, productId, shopId = "") {
    // use the proxy https://cors-anywhere.herokuapp.com/ to bypass cors from client side
    return fetch(
      `http://localhost:3001/api/${origin}/product/history/${productId}/${shopId}`
    )
      .then((res) => res.json())
      .then((product) => {
        if (Array.isArray(product.sellers)) {
          product.sellers = new Map(product.sellers);
        }
        return product;
      });
  }
}
