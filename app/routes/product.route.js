// Mengeksport fungsi yang menerima aplikasi Express (app) sebagai parameter
module.exports = (app) => {
  // Mengimpor controller untuk mengelola permintaan terkait produk
  const products = require("../controllers/product.controller");

  // Membuat instance Router dari Express untuk mendefinisikan rute
  const router = require("express").Router();

  // Menambahkan rute untuk mendapatkan semua produk
  router.get("/", products.findAll); // Menangani permintaan GET untuk mendapatkan semua produk

  // Menambahkan rute untuk mendapatkan satu produk berdasarkan ID produk
  router.get("/:id", products.findOne); // Menangani permintaan GET untuk mendapatkan produk berdasarkan ID

  // Menggunakan router dengan prefix '/api/products' pada aplikasi Express
  app.use("/api/products", router); // Semua rute akan diawali dengan '/api/products'
};
