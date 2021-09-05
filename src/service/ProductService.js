export class ProductService {
  getAllProducts() {
    return fetch("http://localhost:3001/api/products").then((res) =>
      res.json()
    );
  }
}
