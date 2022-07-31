const express = require("express");
const app = express();
const ProductService = require("../services/ProductService");
const Product = require("../models/Product");

app.head("/", (_, res) => {
  res.status(200).send();
});

app.get("/api/:origin/product/current-info/:itemId/:shopId?", (req, res) => {
  ProductService.fetchProduct(
    req.params.origin,
    req.params.itemId,
    req.params.shopId
  ).then((product) => {
    if (product) {
      res.status(200).send(product);
    } else {
      res.status(404).send("Not supported origin");
    }
  });
});

app.get("/api/:origin/product/:itemId", (req, res) => {
  const query = { id: req.params.itemId, origin: req.params.origin };
  Product.findOne(query, (err, product) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    }
    if (product) {
      res.status(200).send(product);
    } else {
      res.status(404).send("Product not found");
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
        res.status(200).send(lastTrackedProduct);
      } else {
        res.status(404).send("Last tracked product not found");
      }
    });
});

app.get("/api/products", (_, res) => {
  Product.find({}, (err, products) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    } else {
      res.status(200).send(products);
    }
  });
});

app.post("/api/product/:id", async (req, res) => {
  const query = { id: req.params.id };
  const itemExisted = await Product.exists(query);
  const newProduct = ProductService.setTrackedDate(req.body);
  if (itemExisted) {
    Product.findOne(query).exec((err, persistedProduct) => {
      if (err) {
        console.error(err);
        res.status(500).send(err);
      } else {
        const isChanged = ProductService.updatePriceHistories(
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
