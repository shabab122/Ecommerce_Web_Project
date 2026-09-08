const test = require("node:test");
const assert = require("node:assert/strict");

const { detectImageMime } = require("../utils/imageSignature");

test("detectImageMime identifies supported image signatures", () => {
  assert.equal(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectImageMime(Buffer.from("GIF89a000000", "ascii")), "image/gif");
  assert.equal(detectImageMime(Buffer.from("RIFF0000WEBP", "ascii")), "image/webp");
});

test("detectImageMime rejects a renamed executable", () => {
  assert.equal(detectImageMime(Buffer.from("#!/bin/sh\necho unsafe", "utf8")), "");
});
