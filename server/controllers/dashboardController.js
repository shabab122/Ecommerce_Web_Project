const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Category = require("../models/Category");

// @route GET /api/admin/dashboard-summary (admin)
const dashboardSummary = async (req, res) => {
  try {
    const [totalProducts, totalCategories, totalUsers, totalOrders, orders] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      User.countDocuments({ role: "user" }),
      Order.countDocuments(),
      Order.find(),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.isPaid ? o.totalAmount : 0), 0);
    const pendingOrders = orders.filter((o) => o.status === "pending").length;

    const lowStockProducts = await Product.find({ stock: { $lte: 5 } })
      .select("name stock")
      .limit(10);

    res.json({
      totalProducts,
      totalCategories,
      totalUsers,
      totalOrders,
      totalRevenue,
      pendingOrders,
      lowStockProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { dashboardSummary };
