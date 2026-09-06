const Review = require("../models/Review");
const Product = require("../models/Product");

const recalcProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  const ratingCount = reviews.length;
  const ratingAverage = ratingCount
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
    : 0;
  await Product.findByIdAndUpdate(productId, {
    ratingAverage: Math.round(ratingAverage * 10) / 10,
    ratingCount,
  });
};

// @route POST /api/reviews { productId, rating, comment }
const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    if (!productId || !rating) {
      return res.status(400).json({ message: "productId and rating are required" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const existing = await Review.findOne({ product: productId, user: req.user._id });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      await existing.save();
    } else {
      await Review.create({ product: productId, user: req.user._id, rating, comment });
    }

    await recalcProductRating(productId);
    res.status(201).json({ message: "Review saved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/reviews/product/:productId
const getReviewsByProduct = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate("user", "name")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route DELETE /api/reviews/:id
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const isOwner = review.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const productId = review.product;
    await review.deleteOne();
    await recalcProductRating(productId);

    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getReviewsByProduct, deleteReview };
