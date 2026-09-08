const matches = (buffer, bytes, offset = 0) =>
  bytes.every((value, index) => buffer[offset + index] === value);

const detectImageMime = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return "";
  if (buffer.length >= 3 && matches(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    buffer.length >= 8 &&
    matches(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) return "image/png";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";
  if (
    buffer.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))
  ) return "image/gif";
  return "";
};

module.exports = { detectImageMime };
