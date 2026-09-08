const express = require("express");
const {
  createBrand,
  deleteBrand,
  getAllBrands,
  getBrand,
  getBrands,
  updateBrand,
} = require("../controllers/brandController");
const { adminOnly, protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", getBrands);
router.get("/manage", protect, adminOnly, getAllBrands);
router.get("/:id", getBrand);
router.post("/", protect, adminOnly, createBrand);
router.put("/:id", protect, adminOnly, updateBrand);
router.delete("/:id", protect, adminOnly, deleteBrand);

module.exports = router;
