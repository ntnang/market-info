const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const ProductResource = require("./resources/ProductResource");
const ProductService = require("./services/ProductService");
const Product = require("./models/Product");

const PORT = 3001;
const TRACKING_INTERVAL = 3000; // One hour

app.use(cors());
app.use(express.json());
app.use(ProductResource);

mongoose.connect("mongodb://localhost/market-info", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const dbConnection = mongoose.connection;
dbConnection.on("error", console.error.bind(console, "connection error:"));
dbConnection.once("open", () => {
  console.log("db connection opened");
});

setInterval(() => {
  Product.find({}, (err, products) => {
    console.log("------------------- START TRACKING -------------------");
    products.forEach(async (product) => {
      const currentDateTime = new Date();
      const isChanged = await ProductService.checkProductChanges(product);
      console.log(
        `[${currentDateTime}][${product.origin}][${product.id}] ${
          isChanged ? "changed" : "not changed"
        }`
      );
    });
    if (err) console.error(err);
  });
}, TRACKING_INTERVAL);

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
