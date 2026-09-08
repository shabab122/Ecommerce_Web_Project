const express = require("express");
const store = require("../config/store");

const router = express.Router();

router.get("/config", (req, res) => {
  res.json({
    currency: store.currency,
    freeShippingThreshold: store.freeShippingThreshold,
    flatShippingFee: store.flatShippingFee,
  });
});

module.exports = router;
