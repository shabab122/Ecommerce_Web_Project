const express = require("express");
const router = express.Router();
const { createReview, getReviewsByProduct, deleteReview } = require("../controllers/reviewController");
const { protect } = require("../middleware/auth");

router.get("/product/:productId", getReviewsByProduct);
router.post("/", protect, createReview);
router.delete("/:id", protect, deleteReview);

module.exports = router;
