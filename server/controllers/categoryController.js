const Category = require("../models/Category");
const Product = require("../models/Product");
const { cleanAssetUrl, cleanText } = require("../utils/validation");

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const createCategory = async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 80);
    if (!name) return res.status(400).json({ message: "Category name is required" });
    const slug = slugify(name);
    if (await Category.exists({ slug })) {
      return res.status(409).json({ message: "Category already exists" });
    }
    const category = await Category.create({
      name,
      slug,
      image: cleanAssetUrl(req.body.image),
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    res.json(await Category.find().sort({ name: 1 }));
  } catch (error) {
    next(error);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (req.body.name !== undefined) {
      const name = cleanText(req.body.name, 80);
      if (!name) return res.status(400).json({ message: "Category name is required" });
      category.name = name;
      category.slug = slugify(name);
    }
    if (req.body.image !== undefined) category.image = cleanAssetUrl(req.body.image);
    res.json(await category.save());
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    if (await Product.exists({ category: req.params.id })) {
      return res.status(409).json({ message: "Cannot delete a category that has products" });
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCategory, deleteCategory, getCategories, getCategory, slugify, updateCategory };
