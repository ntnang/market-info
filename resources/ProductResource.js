const express = require("express");
const app = express();
const ProductService = require("../services/ProductService");
const Product = require("../models/Product");
const ProductOrigin = require("../constants/ProductOrigin");

app.get("/api/:origin/product/current-info/:itemId/:shopId?", (req, res) => {
  if (req.params.origin == ProductOrigin.TIKI_VN) {
    ProductService.fetchTikiProductData(req.params.itemId).then((tikiProduct) =>
      res.status(305).send(tikiProduct)
    );
  } else if (req.params.origin == ProductOrigin.SHOPEE_VN) {
    ProductService.fetchShopeeProductData(
      req.params.itemId,
      req.params.shopId
    ).then((shopeeProduct) => res.status(305).send(shopeeProduct));
  } else {
    res.status(404).send("Not supported origin");
  }
});

app.get("/api/:origin/product/:itemId", (req, res) => {
  const query = { id: req.params.itemId, origin: req.params.origin };
  Product.findOne(query, (err, product) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    }
    if (product) {
      res
        .status(200)
        .send(
          ProductService.convertPersistedProductModelToProductResponse(product)
        );
    } else {
      res.status(404).send();
    }
  });
});

app.get("/api/product/latest", (_, res) => {
  Product.findOne()
    .sort({ lastTrackedDate: -1 })
    .exec((err, lastTrackedProduct) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      }
      if (lastTrackedProduct) {
        res
          .status(200)
          .send(
            ProductService.convertPersistedProductModelToProductResponse(
              lastTrackedProduct
            )
          );
      } else {
        res.status(404).send();
      }
    });
});

app.get("/api/products", (_, res) => {
  Product.find({}, (err, products) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    } else {
      res
        .status(200)
        .send(
          Array.from(products, (product) =>
            ProductService.convertPersistedProductModelToProductResponse(
              product
            )
          )
        );
    }
  });
});

app.post("/api/product/:id", async (req, res) => {
  const query = { id: req.params.id };
  const itemExisted = await Product.exists(query);
  const newProduct = setTrackedDate(req.body);
  if (itemExisted) {
    Product.findOne(query).exec((err, persistedProduct) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      } else {
        const isChanged = ProductService.updatePriceHistoriesIfChanged(
          newProduct,
          persistedProduct
        );
        res.status(isChanged ? 201 : 200).send();
      }
    });
  } else {
    const product = new Product(newProduct);
    product.save((err) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      }
      res.status(201).send();
    });
  }
});

module.exports = app;