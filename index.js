const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");

const ProductResource = require("./resources/ProductResource");
const ProductService = require("./services/ProductService");
const Product = require("./models/Product");

const PORT = process.env.PORT || 3001;
const DB_CONN_STR =
  process.env.DB_CONN_STR || "mongodb://localhost/market-info";
const TRACKING_INTERVAL = process.env.TRACKING_INTERVAL || 3600000;

app.use(cors());
app.use(express.json());
app.use(ProductResource);

// mongodb+srv://admin:4ipskeUb9KaE0BvA@cluster0.odwl3.mongodb.net/nang?retryWrites=true&w=majority
mongoose.connect(DB_CONN_STR, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const dbConnection = mongoose.connection;
dbConnection.on("error", console.error.bind(console, "connection error:"));
dbConnection.once("open", () => {
  console.log("db connection opened");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);

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
});
