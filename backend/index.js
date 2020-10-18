const express = require("express");
const app = express();
const fetch = require("node-fetch");
const cors = require("cors");
const port = 3001;

app.use(cors());
app.get("/api/shopee/:itemId/:shopId", (req, res) => {
  const url = `https://shopee.vn/api/v2/item/get?itemid=${req.params.itemId}&shopid=${req.params.shopId}`;
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      res.send(data);
    });
});

app.listen(port, () => console.log(`Listening on port ${port}...`));
