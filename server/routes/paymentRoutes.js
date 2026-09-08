const express = require("express");
const {
  getPaymentConfig,
  initiateSslcommerz,
  sslcommerzCancel,
  sslcommerzFail,
  sslcommerzIpn,
  sslcommerzSuccess,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/config", getPaymentConfig);
router.post("/sslcommerz/initiate", protect, initiateSslcommerz);
router.post("/sslcommerz/success", sslcommerzSuccess);
router.post("/sslcommerz/fail", sslcommerzFail);
router.post("/sslcommerz/cancel", sslcommerzCancel);
router.post("/sslcommerz/ipn", sslcommerzIpn);

module.exports = router;
