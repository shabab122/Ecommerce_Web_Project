const crypto = require("crypto");
const Invoice = require("../models/Invoice");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const { cancelOrderAndRestoreStock, createOrderFromCart } = require("../services/orderService");
const { syncInvoicePayment } = require("../services/invoiceService");
const {
  createPaymentSession,
  isConfigured,
  isLive,
  validatePayment,
  verifyPaymentForOrder,
} = require("../services/sslcommerzService");

const createTransactionId = () =>
  "NOR" + Date.now().toString(36).toUpperCase() + crypto.randomBytes(5).toString("hex").toUpperCase();

const resultUrl = (status, orderId) => {
  const base = String(process.env.CLIENT_APP_URL || "http://localhost:5000").replace(/\/+$/, "") + "/";
  const url = new URL("payment-result.html", base);
  url.searchParams.set("status", status);
  if (orderId) url.searchParams.set("orderId", orderId.toString());
  return url.toString();
};

const getPaymentConfig = (req, res) => {
  res.json({
    sslcommerzEnabled: isConfigured(),
    environment: isLive() ? "live" : "sandbox",
  });
};

const initiateSslcommerz = async (req, res, next) => {
  if (!isConfigured()) {
    return res.status(503).json({
      message: "SSLCOMMERZ is not configured. Add the gateway credentials to the server environment.",
    });
  }

  let order;
  let invoice;
  let payment;
  try {
    ({ order, invoice } = await createOrderFromCart({
      user: req.user,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: "sslcommerz",
    }));

    if (order.totalAmount < 10 || order.totalAmount > 500000) {
      await cancelOrderAndRestoreStock(order, "Order total is outside payment gateway limits");
      return res.status(400).json({
        message: "SSLCOMMERZ accepts order totals from ৳10 to ৳500,000.",
        orderId: order._id,
      });
    }

    const transactionId = createTransactionId();
    payment = await Payment.create({
      order: order._id,
      user: req.user._id,
      transactionId,
      amount: order.totalAmount,
      currency: order.currency,
    });
    order.transactionId = transactionId;
    await order.save();

    const session = await createPaymentSession({
      order,
      invoice,
      user: req.user,
      transactionId,
    });
    payment.sessionKey = session.sessionKey;
    await payment.save();

    res.status(201).json({
      orderId: order._id,
      invoiceNumber: invoice.invoiceNumber,
      checkoutUrl: session.checkoutUrl,
    });
  } catch (error) {
    if (payment) {
      payment.status = "error";
      payment.failureReason = String(error.message || "Gateway initialization failed").slice(0, 500);
      await payment.save().catch(() => {});
    }
    if (order) {
      order.paymentStatus = "failed";
      await order.save().catch(() => {});
      await Invoice.updateOne({ order: order._id }, { paymentStatus: "failed" }).catch(() => {});
      return res.status(error.statusCode || 502).json({
        message: error.message || "Could not start payment",
        orderId: order._id,
        invoiceNumber: invoice?.invoiceNumber,
      });
    }
    next(error);
  }
};

const markPaymentUnsuccessful = async (transactionId, outcome, reason) => {
  if (!transactionId) return null;
  const payment = await Payment.findOne({ transactionId });
  if (!payment || payment.status === "paid") return payment;

  payment.status = outcome;
  payment.failureReason = String(reason || outcome).slice(0, 500);
  await payment.save();

  const order = await Order.findById(payment.order);
  if (order && !order.isPaid) {
    order.paymentStatus = outcome === "cancelled" ? "cancelled" : "failed";
    await order.save();
    await syncInvoicePayment(order);
  }
  return payment;
};

const validateAndCapture = async (transactionId, validationId) => {
  const payment = await Payment.findOne({ transactionId });
  if (!payment) return { ok: false, reason: "Payment record not found" };
  const order = await Order.findById(payment.order);
  if (!order) return { ok: false, reason: "Order not found" };
  if (payment.status === "paid" && order.isPaid) return { ok: true, order };

  const gatewayResult = await validatePayment(validationId);
  const verification = verifyPaymentForOrder(gatewayResult, payment);

  if (!verification.valid) {
    payment.status = verification.riskLevel === 1 ? "review" : "failed";
    payment.validationId = String(validationId || "").slice(0, 100);
    payment.riskLevel = verification.riskLevel;
    payment.failureReason = verification.riskLevel === 1
      ? "Gateway marked this transaction as high risk"
      : "Transaction, amount, currency, or status validation failed";
    await payment.save();

    order.paymentStatus = verification.riskLevel === 1 ? "pending" : "failed";
    await order.save();
    await syncInvoicePayment(order);
    return { ok: false, order, reason: payment.failureReason };
  }

  const paidAt = new Date();
  payment.status = "paid";
  payment.validationId = String(gatewayResult.val_id || validationId).slice(0, 100);
  payment.bankTransactionId = String(gatewayResult.bank_tran_id || "").slice(0, 100);
  payment.cardType = String(gatewayResult.card_type || "").slice(0, 100);
  payment.riskLevel = verification.riskLevel;
  payment.failureReason = "";
  payment.paidAt = paidAt;

  order.isPaid = true;
  order.paymentStatus = "paid";
  order.paidAt = paidAt;
  if (order.status === "pending") order.status = "processing";
  await Promise.all([payment.save(), order.save()]);
  await syncInvoicePayment(order);
  return { ok: true, order };
};

const sslcommerzSuccess = async (req, res) => {
  try {
    const result = await validateAndCapture(req.body.tran_id, req.body.val_id);
    res.redirect(303, resultUrl(result.ok ? "success" : "failed", result.order?._id));
  } catch {
    res.redirect(303, resultUrl("failed"));
  }
};

const sslcommerzFail = async (req, res) => {
  const payment = await markPaymentUnsuccessful(
    req.body.tran_id,
    "failed",
    req.body.error || "Payment failed"
  ).catch(() => null);
  res.redirect(303, resultUrl("failed", payment?.order));
};

const sslcommerzCancel = async (req, res) => {
  const payment = await markPaymentUnsuccessful(
    req.body.tran_id,
    "cancelled",
    "Customer cancelled checkout"
  ).catch(() => null);
  res.redirect(303, resultUrl("cancelled", payment?.order));
};

const sslcommerzIpn = async (req, res) => {
  try {
    if ((req.body.status === "VALID" || req.body.status === "VALIDATED") && req.body.val_id) {
      const result = await validateAndCapture(req.body.tran_id, req.body.val_id);
      return res.status(result.ok ? 200 : 422).json({ received: true, valid: result.ok });
    }
    const outcome = req.body.status === "CANCELLED" ? "cancelled" : "failed";
    await markPaymentUnsuccessful(req.body.tran_id, outcome, req.body.status || outcome);
    return res.json({ received: true });
  } catch (error) {
    return res.status(500).json({ received: false, message: error.message });
  }
};

module.exports = {
  getPaymentConfig,
  initiateSslcommerz,
  sslcommerzCancel,
  sslcommerzFail,
  sslcommerzIpn,
  sslcommerzSuccess,
};
