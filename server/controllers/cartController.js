const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { isPositiveInteger } = require("../utils/validation");

const cartProductFields = "name images price discountPrice stock";

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product",
      cartProductFields
    );
    if (!cart) return res.json({ user: req.user._id, items: [] });
    let pricesChanged = false;
    for (const item of cart.items) {
      if (!item.product) continue;
      const currentPrice =
        item.product.discountPrice > 0 && item.product.discountPrice < item.product.price
          ? item.product.discountPrice
          : item.product.price;
      if (item.price !== currentPrice) {
        item.price = currentPrice;
        pricesChanged = true;
      }
    }
    if (pricesChanged) await cart.save();
    res.json(cart);
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity ?? 1);
    if (!req.body.productId || !isPositiveInteger(quantity)) {
      return res.status(400).json({ message: "A product and positive whole-number quantity are required" });
    }

    const product = await Product.findById(req.body.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const cart = await getOrCreateCart(req.user._id);
    const productId = String(req.body.productId);
    const existingItem = cart.items.find((item) => item.product.toString() === productId);
    const requestedTotal = quantity + (existingItem ? existingItem.quantity : 0);
    if (requestedTotal > product.stock) {
      return res.status(409).json({ message: "Not enough stock available" });
    }

    const price =
      product.discountPrice > 0 && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;
    if (existingItem) {
      existingItem.quantity = requestedTotal;
      existingItem.price = price;
    } else {
      cart.items.push({ product: product._id, quantity, price });
    }

    await cart.save();
    res.status(201).json(await cart.populate("items.product", cartProductFields));
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!isPositiveInteger(quantity)) {
      return res.status(400).json({ message: "Quantity must be a positive whole number" });
    }
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Cart item not found" });

    const product = await Product.findById(item.product);
    if (!product) return res.status(409).json({ message: "This product is no longer available" });
    if (quantity > product.stock) {
      return res.status(409).json({ message: "Not enough stock available" });
    }
    item.quantity = quantity;
    item.price =
      product.discountPrice > 0 && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;
    await cart.save();
    res.json(await cart.populate("items.product", cartProductFields));
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const before = cart.items.length;
    cart.items = cart.items.filter((item) => item._id.toString() !== req.params.itemId);
    if (before === cart.items.length) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    await cart.save();
    res.json(await cart.populate("items.product", cartProductFields));
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json({ message: "Cart cleared" });
  } catch (error) {
    next(error);
  }
};

module.exports = { addToCart, clearCart, getCart, removeCartItem, updateCartItem };
