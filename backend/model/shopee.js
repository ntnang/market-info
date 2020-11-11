const mongoose = require("mongoose");

const shopeeSchema = mongoose.Schema({
  itemid: String,
  shopid: String,
  name: String,
  price_max: Number,
  trackedDate: Date,
});

module.exports = mongoose.model("Shopee", shopeeSchema);
