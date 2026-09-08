const Brand = require("../models/Brand");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { slugify } = require("./categoryController");
const { cleanAssetUrl, cleanText, escapeRegExp } = require("../utils/validation");

const parseProductPayload = async (body, currentProduct = null) => {
  const name = body.name !== undefined ? cleanText(body.name, 140) : currentProduct?.name;
  const description =
    body.description !== undefined ? cleanText(body.description, 3000) : currentProduct?.description;
  const price = body.price !== undefined ? Number(body.price) : currentProduct?.price;
  const discountPrice =
    body.discountPrice !== undefined ? Number(body.discountPrice || 0) : currentProduct?.discountPrice;
  const stock = body.stock !== undefined ? Number(body.stock) : currentProduct?.stock;
  const categoryId = body.category !== undefined ? body.category : currentProduct?.category;
  const brandId = body.brandRef !== undefined ? body.brandRef : currentProduct?.brandRef;

  if (!name || !categoryId || !Number.isFinite(price) || price <= 0) {
    const error = new Error("Name, category and a price greater than zero are required");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(stock) || stock < 0) {
    const error = new Error("Stock must be a whole number of zero or more");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(discountPrice) || discountPrice < 0 || discountPrice >= price) {
    if (discountPrice !== 0) {
      const error = new Error("Discount price must be zero or lower than the regular price");
      error.statusCode = 400;
      throw error;
    }
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    const error = new Error("Selected category does not exist");
    error.statusCode = 400;
    throw error;
  }

  let brand = null;
  if (brandId) {
    brand = await Brand.findById(brandId);
    if (!brand) {
      const error = new Error("Selected brand does not exist");
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    name,
    description,
    price,
    discountPrice,
    stock,
    category: category._id,
    brandRef: brand?._id || null,
    brand: brand?.name || cleanText(body.brand, 80) || currentProduct?.brand || "Generic",
    images: Array.isArray(body.images)
      ? body.images.map(cleanAssetUrl).filter(Boolean).slice(0, 6)
      : currentProduct?.images || [],
    isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : currentProduct?.isFeatured,
  };
};

const uniqueSlug = async (name, excludedId = null) => {
  const base = slugify(name) || "product";
  let candidate = base;
  let suffix = 1;
  const filter = () => ({
    slug: candidate,
    ...(excludedId ? { _id: { $ne: excludedId } } : {}),
  });
  while (await Product.exists(filter())) {
    candidate = base + "-" + suffix;
    suffix += 1;
  }
  return candidate;
};

const createProduct = async (req, res, next) => {
  try {
    const payload = await parseProductPayload(req.body);
    payload.slug = await uniqueSlug(payload.name);
    const product = await Product.create(payload);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const { category, brand, keyword, minPrice, maxPrice, featured, sort } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (brand) filter.brandRef = brand;
    if (featured !== undefined && featured !== "") filter.isFeatured = featured === "true";
    if (keyword) {
      const safeKeyword = escapeRegExp(cleanText(keyword, 80));
      filter.$or = [
        { name: { $regex: safeKeyword, $options: "i" } },
        { description: { $regex: safeKeyword, $options: "i" } },
        { brand: { $regex: safeKeyword, $options: "i" } },
      ];
    }

    if (minPrice || maxPrice) {
      const effectivePrice = {
        $cond: [
          { $and: [{ $gt: ["$discountPrice", 0] }, { $lt: ["$discountPrice", "$price"] }] },
          "$discountPrice",
          "$price",
        ],
      };
      const conditions = [];
      if (minPrice && Number.isFinite(Number(minPrice))) {
        conditions.push({ $gte: [effectivePrice, Number(minPrice)] });
      }
      if (maxPrice && Number.isFinite(Number(maxPrice))) {
        conditions.push({ $lte: [effectivePrice, Number(maxPrice)] });
      }
      if (conditions.length) filter.$expr = { $and: conditions };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { price: 1, createdAt: -1 };
    if (sort === "price_desc") sortOption = { price: -1, createdAt: -1 };
    if (sort === "top_rated") sortOption = { ratingAverage: -1, ratingCount: -1 };

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .populate("brandRef", "name slug logo")
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ products, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("brandRef", "name slug logo");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const payload = await parseProductPayload(req.body, product);
    Object.assign(product, payload);
    if (req.body.name !== undefined) product.slug = await uniqueSlug(payload.name, product._id);
    res.json(await product.save());
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createProduct, deleteProduct, getProduct, getProducts, updateProduct };
