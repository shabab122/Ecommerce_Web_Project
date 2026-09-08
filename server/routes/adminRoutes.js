const express = require("express");
const router = express.Router();
const { dashboardSummary } = require("../controllers/dashboardController");
const { orderReportCsv } = require("../controllers/reportController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/dashboard-summary", protect, adminOnly, dashboardSummary);
router.get("/reports/orders.csv", protect, adminOnly, orderReportCsv);

module.exports = router;
