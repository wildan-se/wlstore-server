const db = require("../models");
const Product = db.products;
const path = require("path");
const fs = require("fs").promises; // Use promises version for better performance

// Input validation helper
function validateProductData(data) {
  const errors = [];

  if (!data.code?.trim()) errors.push("Product code is required");
  if (!data.name?.trim()) errors.push("Product name is required");
  if (data.price === undefined || data.price < 0)
    errors.push("Valid price is required");
  if (
    data.stock !== undefined &&
    (data.stock < 0 || !Number.isInteger(Number(data.stock)))
  ) {
    errors.push("Stock must be a non-negative integer");
  }
  if (
    data.averageRating !== undefined &&
    (data.averageRating < 0 || data.averageRating > 5)
  ) {
    errors.push("Average rating must be between 0 and 5");
  }

  return errors;
}

// --- READ OPERATIONS (MISSING FUNCTIONS - NOW ADDED BACK) ---

// Fungsi untuk mendapatkan semua produk (with pagination and caching)
exports.findAll = async (req, res) => {
  try {
    // Add pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Add sorting and filtering
    const sort = req.query.sort || "createdAt";
    const order = req.query.order === "desc" ? -1 : 1;

    const [products, total] = await Promise.all([
      Product.find()
        .sort({ [sort]: order })
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance
      Product.countDocuments(),
    ]);

    if (!products || products.length === 0) {
      return res.status(200).send({
        message: "No products found.",
        data: [],
        pagination: { page, limit, total, pages: 0 },
      });
    }

    res.status(200).send({
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error retrieving products:", err);
    res.status(500).send({
      message: err.message || "An error occurred while retrieving products.",
    });
  }
};

// Fungsi untuk menemukan satu produk berdasarkan kode produk
exports.findOne = async (req, res) => {
  const productCode = req.params.id;
  if (!productCode) {
    return res.status(400).send({ message: "Product code is required." });
  }

  try {
    const product = await Product.findOne({ code: productCode });
    if (!product) {
      return res
        .status(404)
        .send({ message: `Product with code '${productCode}' not found.` });
    }
    res.status(200).send(product);
  } catch (err) {
    console.error("Error retrieving product:", err);
    res.status(500).send({
      message: err.message || "An error occurred while retrieving product.",
    });
  }
};

// --- CREATE OPERATION ---

// Fungsi untuk membuat produk baru (with better validation)
exports.create = async (req, res) => {
  try {
    // Validate input
    const validationErrors = validateProductData(req.body);
    if (validationErrors.length > 0) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      return res.status(400).send({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Determine imageUrl
    let imageUrlPath = "";
    if (req.file) {
      imageUrlPath = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrlPath = req.body.imageUrl;
    }

    // Create product object
    const product = new Product({
      code: req.body.code.trim(),
      name: req.body.name.trim(),
      price: parseFloat(req.body.price),
      description: req.body.description?.trim() || "",
      imageUrl: imageUrlPath,
      averageRating: parseFloat(req.body.averageRating) || 0,
      stock: parseInt(req.body.stock) || 0,
    });

    const savedProduct = await product.save();
    res.status(201).send(savedProduct);
  } catch (err) {
    // Clean up uploaded file if save fails
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }

    if (err.code === 11000) {
      return res.status(409).send({
        message: `Product with code '${req.body.code}' already exists.`,
      });
    }

    console.error("Error creating product:", err);
    res.status(500).send({
      message: err.message || "An error occurred while creating the product.",
    });
  }
};

// Fungsi untuk memperbarui produk berdasarkan kode produk
exports.update = async (req, res) => {
  const productCode = req.params.id;
  if (!productCode) {
    // Hapus file jika ada tapi productCode tidak valid
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res
      .status(400)
      .send({ message: "Product code is required for update." });
  }

  // Periksa apakah ada data yang dikirim untuk update
  if (Object.keys(req.body).length === 0 && !req.file) {
    return res
      .status(400)
      .send({ message: "No data or file provided for update." });
  }

  const updateData = { ...req.body };

  // Jika ada file baru diupload, update imageUrl
  if (req.file) {
    updateData.imageUrl = `/uploads/${req.file.filename}`;
  } else if (req.body.imageUrl !== undefined) {
    updateData.imageUrl = req.body.imageUrl;
  }

  // Konversi tipe data jika ada
  if (updateData.price) updateData.price = parseFloat(updateData.price);
  if (updateData.averageRating)
    updateData.averageRating = parseFloat(updateData.averageRating);
  if (updateData.stock) updateData.stock = parseInt(updateData.stock);

  try {
    // Sebelum update, ambil produk lama untuk mendapatkan imageUrl lama
    const oldProduct = await Product.findOne({ code: productCode });

    const updatedProduct = await Product.findOneAndUpdate(
      { code: productCode },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      // Jika produk tidak ditemukan, dan ada file baru diupload, hapus filenya
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(404)
        .send({ message: `Product with code '${productCode}' not found.` });
    }

    // Hapus file gambar lama jika ada file baru diupload dan bukan gambar default
    if (
      req.file &&
      oldProduct &&
      oldProduct.imageUrl &&
      oldProduct.imageUrl.startsWith("/uploads/")
    ) {
      const oldImagePath = path.join(
        __dirname,
        "..",
        "public",
        oldProduct.imageUrl
      );
      fs.unlink(oldImagePath, (err) => {
        if (err)
          console.error("Failed to delete old image:", oldImagePath, err);
      });
    }

    res
      .status(200)
      .send({ message: "Product updated successfully!", data: updatedProduct });
  } catch (err) {
    // Jika update gagal, hapus file baru yang mungkin sudah diupload
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Error updating product:", err);
    res.status(500).send({
      message: err.message || "An error occurred while updating the product.",
    });
  }
};

// Fungsi untuk menghapus produk berdasarkan kode produk
exports.delete = async (req, res) => {
  const productCode = req.params.id;
  if (!productCode) {
    return res
      .status(400)
      .send({ message: "Product code is required for deletion." });
  }

  try {
    const deletedProduct = await Product.findOneAndDelete({
      code: productCode,
    });

    if (!deletedProduct) {
      return res
        .status(404)
        .send({ message: `Product with code '${productCode}' not found.` });
    }

    // Hapus file gambar terkait jika ada dan bukan gambar default
    if (
      deletedProduct.imageUrl &&
      deletedProduct.imageUrl.startsWith("/uploads/")
    ) {
      const imagePath = path.join(
        __dirname,
        "..",
        "public",
        deletedProduct.imageUrl
      );
      fs.unlink(imagePath, (err) => {
        if (err)
          console.error("Failed to delete product image:", imagePath, err);
      });
    }

    res.status(200).send({ message: "Product deleted successfully!" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send({
      message: err.message || "An error occurred while deleting the product.",
    });
  }
};
