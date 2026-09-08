const test = require("node:test");
const assert = require("node:assert/strict");

const { cleanAssetUrl, cleanText, escapeRegExp, isPositiveInteger, isValidEmail } = require("../utils/validation");

test("validation helpers normalize text and reject malformed values", () => {
  assert.equal(cleanText("  Norda Store  ", 8), "Norda St");
  assert.equal(cleanText({ value: "bad" }), "");
  assert.equal(isValidEmail("shopper@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isPositiveInteger("3"), true);
  assert.equal(isPositiveInteger("3.2"), false);
});

test("cleanAssetUrl accepts upload/http paths and drops active schemes", () => {
  assert.equal(cleanAssetUrl("/uploads/123-image.webp"), "/uploads/123-image.webp");
  assert.equal(cleanAssetUrl("https://images.example.com/item.png"), "https://images.example.com/item.png");
  assert.equal(cleanAssetUrl("javascript:alert(1)"), "");
  assert.equal(cleanAssetUrl("data:image/svg+xml,bad"), "");
});

test("escapeRegExp treats catalog searches as literal text", () => {
  const expression = new RegExp(escapeRegExp("(headphones)+"), "i");
  assert.equal(expression.test("New (headphones)+ collection"), true);
  assert.equal(expression.test("headphones headphones"), false);
});
