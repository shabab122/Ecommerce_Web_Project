const express = require("express");
const router = express.Router();
const { dashboardSummary } = require("../controllers/dashboardController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/dashboard-summary", protect, adminOnly, dashboardSummary);

module.exports = router;
