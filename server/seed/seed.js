require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { slugify } = require("../controllers/categoryController");

const run = async () => {
  await connectDB();

  // 1. Admin user
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: process.env.ADMIN_NAME || "Super Admin",
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || "Admin@12345",
      role: "admin",
    });
    console.log(`Admin created -> email: ${adminEmail} password: ${process.env.ADMIN_PASSWORD || "Admin@12345"}`);
  } else {
    console.log("Admin already exists, skipping.");
  }

  // 2. Categories
  const categoryNames = ["Electronics", "Fashion", "Home & Kitchen", "Sports & Outdoors", "Books"];
  const categories = {};
  for (const name of categoryNames) {
    const slug = slugify(name);
    let cat = await Category.findOne({ slug });
    if (!cat) {
      cat = await Category.create({ name, slug });
    }
    categories[name] = cat;
  }
  console.log("Categories ready.");

  // 3. Sample products
  const sampleProducts = [
    { name: "Wireless Bluetooth Headphones", category: "Electronics", price: 59.99, discountPrice: 45.99, stock: 40, brand: "SoundMax", isFeatured: true, description: "Over-ear wireless headphones with noise isolation and 30-hour battery life." },
    { name: "Smartwatch Fitness Tracker", category: "Electronics", price: 89.99, discountPrice: 0, stock: 25, brand: "FitTrack", isFeatured: true, description: "Track your steps, heart rate, and sleep with this sleek smartwatch." },
    { name: "Men's Casual Denim Jacket", category: "Fashion", price: 49.5, discountPrice: 39.99, stock: 30, brand: "UrbanWear", isFeatured: false, description: "Classic denim jacket made from durable, breathable cotton." },
    { name: "Women's Running Shoes", category: "Fashion", price: 65.0, discountPrice: 0, stock: 50, brand: "StrideFit", isFeatured: true, description: "Lightweight running shoes with responsive cushioning." },
    { name: "Non-Stick Cookware Set (10-Piece)", category: "Home & Kitchen", price: 120.0, discountPrice: 99.99, stock: 15, brand: "ChefPro", isFeatured: true, description: "Durable non-stick cookware set including pans, pots and lids." },
    { name: "Electric Kettle 1.7L", category: "Home & Kitchen", price: 29.99, discountPrice: 0, stock: 60, brand: "HomeEase", isFeatured: false, description: "Fast-boiling electric kettle with auto shut-off safety feature." },
    { name: "Yoga Mat with Carry Strap", category: "Sports & Outdoors", price: 24.99, discountPrice: 19.99, stock: 80, brand: "ZenFit", isFeatured: false, description: "Non-slip, eco-friendly yoga mat, 6mm thick for extra comfort." },
    { name: "Adjustable Dumbbell Set", category: "Sports & Outdoors", price: 150.0, discountPrice: 0, stock: 10, brand: "IronCore", isFeatured: true, description: "Space-saving adjustable dumbbells from 5 to 25 lbs per hand." },
    { name: "The Art of Clean Code", category: "Books", price: 22.0, discountPrice: 17.5, stock: 100, brand: "TechPress", isFeatured: false, description: "A practical guide to writing maintainable, readable software." },
    { name: "Mystery Island - Novel", category: "Books", price: 14.99, discountPrice: 0, stock: 70, brand: "Penbound", isFeatured: false, description: "A gripping mystery novel set on a remote island." },
  ];

  for (const p of sampleProducts) {
    const exists = await Product.findOne({ name: p.name });
    if (exists) continue;

    let slug = slugify(p.name);
    let candidate = slug;
    let i = 1;
    while (await Product.findOne({ slug: candidate })) {
      candidate = `${slug}-${i++}`;
    }

    await Product.create({
      name: p.name,
      slug: candidate,
      description: p.description,
      price: p.price,
      discountPrice: p.discountPrice,
      stock: p.stock,
      category: categories[p.category]._id,
      brand: p.brand,
      images: [],
      isFeatured: p.isFeatured,
    });
  }
  console.log("Sample products ready.");

  console.log("Seeding complete.");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
