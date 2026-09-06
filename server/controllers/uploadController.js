// @route POST /api/uploads (admin) - multipart/form-data field name "image"
const uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const filePath = `/uploads/${req.file.filename}`;
  res.status(201).json({ url: filePath });
};

module.exports = { uploadImage };
