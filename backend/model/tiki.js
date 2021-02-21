const mongoose = require("mongoose");

const tikiSchema = mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  thumbnailUrl: String,
  sellers: {
    type: Map,
    of: {
      storeId: String,
      name: String,
      slug: String,
      sku: String,
      logo: String,
      productId: String,
      priceHistories: [{ price: Number, trackedDate: Date }],
    },
  },
  lastTrackedDate: Date,
});

module.exports = mongoose.model("Tiki", tikiSchema);
