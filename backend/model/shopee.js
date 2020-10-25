const mongoose = require("mongoose");

const shopeeSchema = mongoose.Schema({
  itemid: String,
  name: String,
  price_max: Number,
});

module.exports = mongoose.model("Shopee", shopeeSchema);
