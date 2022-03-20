const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  id: String,
  name: String,
  thumbnailUrl: String,
  imagesUrls: String,
  origin: String,
  minPrice: Number,
  maxPrice: Number,
  options: [{ name: String, values: [String] }],
  variants: [
    {
      id: String,
      name: String,
      imagesUrls: [String],
      configurations: [{ option: String, value: String }],
      sellers: [
        {
          id: String,
          priceHistories: [{ price: Number, trackedDate: Date }],
        },
      ],
    },
  ],
  sellers: [
    {
      id: String,
      name: String,
      logoUrl: String,
    },
  ],
  lastTrackedDate: Date,
});

module.exports = mongoose.model("Product", productSchema);
