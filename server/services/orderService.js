const Cart = require("../models/Cart");
const Invoice = require("../models/Invoice");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const store = require("../config/store");
const httpError = require("../utils/httpError");
const { cleanText, isPositiveInteger } = require("../utils/validation");
const { createInvoiceForOrder, syncInvoicePayment } = require("./invoiceService");

const REQUIRED_ADDRESS_FIELDS = ["line1", "city", "district", "postCode", "phone"];

const normalizeShippingAddress = (value = {}) => {
  const address = {
    line1: cleanText(value.line1, 120),
    line2: cleanText(value.line2, 120),
    city: cleanText(value.city, 60),
    district: cleanText(value.district, 60),
    postCode: cleanText(value.postCode, 20),
    country: cleanText(value.country, 60) || "Bangladesh",
    phone: cleanText(value.phone, 20),
  };

  const missing = REQUIRED_ADDRESS_FIELDS.filter((field) => !address[field]);
  if (missing.length) {
    throw httpError(400, "Shipping address is incomplete: " + missing.join(", "));
  }
  if (!/^[+()\d\s-]{7,20}$/.test(address.phone)) {
    throw httpError(400, "Please provide a valid phone number");
  }
  return address;
};

const calculateTotals = (items, options = {}) => {
  const threshold = options.freeShippingThreshold ?? store.freeShippingThreshold;
  const flatFee = options.flatShippingFee ?? store.flatShippingFee;
  const subtotal = Number(
    items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0).toFixed(2)
  );
  const shippingFee = subtotal >= threshold ? 0 : flatFee;
  return {
    subtotal,
    shippingFee,
    totalAmount: Number((subtotal + shippingFee).toFixed(2)),
  };
};

const toOrderItems = (cart) => {
  const items = [];
  for (const cartItem of cart.items) {
    const product = cartItem.product;
    if (!product) throw httpError(409, "A product in your cart is no longer available");
    if (!isPositiveInteger(cartItem.quantity)) {
      throw httpError(400, "Invalid quantity for " + product.name);
    }
    const currentPrice =
      product.discountPrice > 0 && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;
    items.push({
      product: product._id,
      name: product.name,
      quantity: Number(cartItem.quantity),
      price: Number(currentPrice),
      image: product.images?.[0] || "",
    });
  }
  return items;
};

const rollbackReservedStock = async (reservedItems) => {
  await Promise.all(
    reservedItems.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
    )
  );
};

const reserveStock = async (items) => {
  const reserved = [];
  for (const item of items) {
    const product = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    if (!product) {
      await rollbackReservedStock(reserved);
      throw httpError(409, "Not enough stock for " + item.name);
    }
    reserved.push(item);
  }
  return reserved;
};

const createOrderFromCart = async ({ user, shippingAddress, paymentMethod }) => {
  if (!["cod", "sslcommerz"].includes(paymentMethod)) {
    throw httpError(400, "Unsupported payment method");
  }

  const address = normalizeShippingAddress(shippingAddress);
  const cart = await Cart.findOne({ user: user._id }).populate("items.product");
  if (!cart || cart.items.length === 0) throw httpError(400, "Your cart is empty");

  const items = toOrderItems(cart);
  if (!items.length) throw httpError(400, "Your cart is empty");
  const totals = calculateTotals(items);
  const reserved = await reserveStock(items);

  let order;
  let invoice;
  try {
    order = await Order.create({
      user: user._id,
      items,
      shippingAddress: address,
      ...totals,
      currency: store.currency,
      paymentMethod,
      paymentStatus: "pending",
    });
    invoice = await createInvoiceForOrder(order);
    cart.items = [];
    await cart.save();
    await User.findByIdAndUpdate(user._id, { address });
    return { order, invoice };
  } catch (error) {
    if (invoice) await Invoice.deleteOne({ _id: invoice._id });
    if (order) await Order.deleteOne({ _id: order._id });
    await rollbackReservedStock(reserved);
    throw error;
  }
};

const ORDER_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const canTransitionOrder = (from, to) =>
  from === to || Boolean(ORDER_TRANSITIONS[from]?.includes(to));

const cancelOrderAndRestoreStock = async (order, reason = "") => {
  if (order.isPaid) {
    throw httpError(409, "Paid orders require a refund before cancellation");
  }
  if (order.stockRestored) return order;

  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, stockRestored: false },
    {
      $set: {
        stockRestored: true,
        status: "cancelled",
        paymentStatus: "cancelled",
        cancelledAt: new Date(),
        cancelReason: cleanText(reason, 300) || "Cancelled by administrator",
      },
    },
    { new: true }
  );
  if (!claimed) return Order.findById(order._id);

  const restoredItems = [];
  try {
    for (const item of claimed.items) {
      const result = await Product.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      );
      if (result.matchedCount) restoredItems.push(item);
    }
    await syncInvoicePayment(claimed);
    return claimed;
  } catch (error) {
    await Promise.allSettled(
      restoredItems.map((item) =>
        Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } })
      )
    );
    await Order.updateOne(
      { _id: claimed._id },
      {
        $set: {
          stockRestored: false,
          status: order.status,
          paymentStatus: order.paymentStatus,
          cancelledAt: null,
          cancelReason: "",
        },
      }
    );
    throw error;
  }
};

module.exports = {
  calculateTotals,
  canTransitionOrder,
  cancelOrderAndRestoreStock,
  createOrderFromCart,
  normalizeShippingAddress,
};
