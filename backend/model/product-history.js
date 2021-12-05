const mongoose = require("mongoose");

const productHistorySchema = mongoose.Schema({
  id: String,
  name: String,
  thumbnailUrl: String,
  imagesUrls: [String],
  origin: String,
  sellers: {
    type: Map,
    of: {
      name: String,
      logoUrl: String,
      priceHistories: [{ price: Number, trackedDate: Date }],
    },
  },
  lastTrackedDate: Date,
});

module.exports = mongoose.model("ProductHistory", productHistorySchema);
