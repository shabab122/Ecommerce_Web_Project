const Product = require("../models/Product");
const { slugify } = require("./categoryController");

// @route POST /api/products (admin)
const createProduct = async (req, res) => {
  try {
    const { name, description, price, discountPrice, stock, category, brand, images, isFeatured } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: "Name, price and category are required" });
    }

    let slug = slugify(name);
    let candidate = slug;
    let i = 1;
    while (await Product.findOne({ slug: candidate })) {
      candidate = `${slug}-${i++}`;
    }

    const product = await Product.create({
      name,
      slug: candidate,
      description,
      price,
      discountPrice: discountPrice || 0,
      stock: stock || 0,
      category,
      brand,
      images: images || [],
      isFeatured: !!isFeatured,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/products
// supports: ?category=<id>&keyword=<text>&minPrice=&maxPrice=&featured=true&sort=price_asc|price_desc|newest&page=1&limit=12
const getProducts = async (req, res) => {
  try {
    const { category, keyword, minPrice, maxPrice, featured, sort, page = 1, limit = 12 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (featured) filter.isFeatured = featured === "true";
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { price: 1 };
    if (sort === "price_desc") sortOption = { price: -1 };
    if (sort === "newest") sortOption = { createdAt: -1 };
    if (sort === "top_rated") sortOption = { ratingAverage: -1 };

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.max(Number(limit), 1);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort(sortOption)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/products/:id
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name slug");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route PUT /api/products/:id (admin)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const fields = ["name", "description", "price", "discountPrice", "stock", "category", "brand", "images", "isFeatured"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) product[f] = req.body[f];
    });
    if (req.body.name) product.slug = slugify(req.body.name);

    const updated = await product.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route DELETE /api/products/:id (admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProduct, getProducts, getProduct, updateProduct, deleteProduct };
