const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanText = (value, maxLength = 255) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const isValidEmail = (value) => EMAIL_PATTERN.test(cleanText(value, 254).toLowerCase());

const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const escapeRegExp = (value) => value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");

const cleanAssetUrl = (value) => {
  const clean = cleanText(value, 500);
  if (!clean) return "";
  if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(clean)) return clean;
  try {
    const url = new URL(clean);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
};

module.exports = { cleanAssetUrl, cleanText, isValidEmail, isPositiveInteger, escapeRegExp };
