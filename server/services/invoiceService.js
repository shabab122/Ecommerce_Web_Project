const Invoice = require("../models/Invoice");

const createInvoiceNumber = (order) => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const orderPart = order._id.toString().slice(-8).toUpperCase();
  return "NOR-" + datePart + "-" + orderPart;
};

const createInvoiceForOrder = async (order) =>
  Invoice.create({
    invoiceNumber: createInvoiceNumber(order),
    order: order._id,
    user: order.user,
    items: order.items.map((item) => ({
      product: item.product,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      lineTotal: Number((item.price * item.quantity).toFixed(2)),
    })),
    shippingAddress: order.shippingAddress,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
  });

const syncInvoicePayment = async (order) =>
  Invoice.findOneAndUpdate(
    { order: order._id },
    {
      paymentStatus: order.paymentStatus,
      paidAt: order.paymentStatus === "paid" ? order.paidAt || new Date() : null,
    },
    { new: true }
  );

module.exports = { createInvoiceForOrder, createInvoiceNumber, syncInvoicePayment };
