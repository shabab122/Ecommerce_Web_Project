const Order = require("../models/Order");
const { syncInvoicePayment } = require("../services/invoiceService");
const {
  canTransitionOrder,
  cancelOrderAndRestoreStock,
  createOrderFromCart,
} = require("../services/orderService");

const createOrder = async (req, res, next) => {
  try {
    if (req.body.paymentMethod && req.body.paymentMethod !== "cod") {
      return res.status(400).json({
        message: "Use the SSLCOMMERZ payment endpoint for online checkout",
      });
    }
    const result = await createOrderFromCart({
      user: req.user,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: "cod",
    });
    res.status(201).json({
      ...result.order.toObject(),
      invoiceNumber: result.invoice.invoiceNumber,
    });
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    const ownerId = order.user?._id || order.user;
    const isOwner = ownerId && ownerId.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const requestedStatus = req.body.status || order.status;
    if (!canTransitionOrder(order.status, requestedStatus)) {
      return res.status(409).json({
        message: "Order cannot move from " + order.status + " to " + requestedStatus,
      });
    }

    if (requestedStatus === "cancelled" && order.status !== "cancelled") {
      return res.json(await cancelOrderAndRestoreStock(order, req.body.cancelReason));
    }

    if (
      order.paymentMethod === "sslcommerz" &&
      !order.isPaid &&
      ["processing", "shipped", "delivered"].includes(requestedStatus)
    ) {
      return res.status(409).json({
        message: "An online order cannot be fulfilled until payment is validated",
      });
    }

    if (req.body.isPaid === false && order.isPaid) {
      return res.status(409).json({ message: "A paid order cannot be marked unpaid" });
    }
    if (req.body.isPaid === true && order.paymentMethod !== "cod") {
      return res.status(409).json({
        message: "Online payments can only be marked paid by validated gateway callbacks",
      });
    }

    order.status = requestedStatus;
    if (req.body.isPaid === true || (requestedStatus === "delivered" && order.paymentMethod === "cod")) {
      order.isPaid = true;
      order.paymentStatus = "paid";
      order.paidAt = order.paidAt || new Date();
    }
    await order.save();
    await syncInvoicePayment(order);
    res.json(order);
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder, getAllOrders, getMyOrders, getOrder, updateOrderStatus };
