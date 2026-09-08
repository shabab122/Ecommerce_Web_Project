const Brand = require("../models/Brand");
const Product = require("../models/Product");
const { slugify } = require("./categoryController");
const { cleanAssetUrl, cleanText } = require("../utils/validation");

const createBrand = async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 80);
    if (!name) return res.status(400).json({ message: "Brand name is required" });
    const slug = slugify(name);
    if (await Brand.exists({ slug })) {
      return res.status(409).json({ message: "Brand already exists" });
    }
    const brand = await Brand.create({
      name,
      slug,
      description: cleanText(req.body.description, 500),
      logo: cleanAssetUrl(req.body.logo),
      isActive: req.body.isActive !== false,
    });
    res.status(201).json(brand);
  } catch (error) {
    next(error);
  }
};

const getBrands = async (req, res, next) => {
  try {
    res.json(await Brand.find({ isActive: true }).sort({ name: 1 }));
  } catch (error) {
    next(error);
  }
};

const getAllBrands = async (req, res, next) => {
  try {
    res.json(await Brand.find().sort({ name: 1 }));
  } catch (error) {
    next(error);
  }
};

const getBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    res.json(brand);
  } catch (error) {
    next(error);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    if (req.body.name !== undefined) {
      const name = cleanText(req.body.name, 80);
      if (!name) return res.status(400).json({ message: "Brand name is required" });
      brand.name = name;
      brand.slug = slugify(name);
    }
    if (req.body.description !== undefined) {
      brand.description = cleanText(req.body.description, 500);
    }
    if (req.body.logo !== undefined) brand.logo = cleanAssetUrl(req.body.logo);
    if (req.body.isActive !== undefined) brand.isActive = Boolean(req.body.isActive);
    res.json(await brand.save());
  } catch (error) {
    next(error);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    if (await Product.exists({ brandRef: req.params.id })) {
      return res.status(409).json({ message: "Cannot delete a brand that has products" });
    }
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    res.json({ message: "Brand deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBrand, deleteBrand, getAllBrands, getBrand, getBrands, updateBrand };
