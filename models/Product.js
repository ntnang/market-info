const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  id: String,
  name: String,
  thumbnailUrl: String,
  imagesUrls: [String],
  origin: String,
  minPrice: Number,
  maxPrice: Number,
  options: [{ name: String, values: [String] }],
  variants: {
    type: Map,
    of: {
      name: String,
      imagesUrls: [String],
      configurations: [{ option: String, value: String }],
      sellers: {
        type: Map,
        of: {
          priceHistories: [{ price: Number, trackedDate: Date }],
        },
      },
    },
  },
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

module.exports = mongoose.model("Product", productSchema);
