// Mengeksport fungsi yang menerima aplikasi Express (app) sebagai parameter
module.exports = (app) => {
  // Mengimpor controller untuk mengelola permintaan terkait pesanan
  const orders = require("../controllers/order.controller");

  // Membuat instance Router dari Express untuk mendefinisikan rute
  const router = require("express").Router();

  // Menambahkan rute untuk mendapatkan pesanan berdasarkan ID pengguna
  router.get("/user/:id", orders.findOrder);
  // Menambahkan rute untuk menambahkan produk ke keranjang pengguna berdasarkan ID pengguna
  router.post("/user/:id/add", orders.addToCart);
  // Menambahkan rute untuk menghapus produk dari keranjang berdasarkan ID pengguna dan kode produk
  router.delete("/user/:id/product/:product", orders.removeFromCart);

  // Menggunakan router dengan prefix '/api/orders' pada aplikasi Express
  app.use("/api/orders", router);
};
