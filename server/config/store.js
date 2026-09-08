const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

module.exports = {
  currency: "BDT",
  freeShippingThreshold: toPositiveNumber(process.env.FREE_SHIPPING_THRESHOLD, 5000),
  flatShippingFee: toPositiveNumber(process.env.FLAT_SHIPPING_FEE, 120),
};
