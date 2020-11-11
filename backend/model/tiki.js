const mongoose = require("mongoose");

const tikiSchema = mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  thumbnail_url: String,
  current_seller: {
    id: String,
    store_id: String,
    name: String,
    slug: String,
    sku: String,
    price: Number,
    logo: String,
    product_id: String,
  },
  trackedDate: Date,
});

module.exports = mongoose.model("Tiki", tikiSchema);
