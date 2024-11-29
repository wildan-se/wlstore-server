module.exports = (app) => {
  // Mengekspor fungsi untuk mendefinisikan rute terkait "orders"
  // Fungsi ini menerima parameter "app", yang merupakan instance dari aplikasi Express

  // Mengimpor controller "order.controller" untuk menghubungkan rute dengan logika bisnisnya
  const orders = require("../controllers/order.controller");

  // Membuat instance Router dari Express
  const router = require("express").Router();

  // Mendefinisikan rute GET untuk mendapatkan pesanan berdasarkan ID pengguna
  // URL: /api/orders/user/:id
  // Controller: orders.findOrder
  // ':id' adalah parameter dinamis yang akan diproses oleh controller
  router.get("/user/:id", orders.findOrder);
  router.post("/user/:id/add", orders.addToCart);
  router.delete("/user/:id/product/:product", orders.removeFromCart);

  // Mendaftarkan router ini ke aplikasi utama dengan prefix '/api/orders'
  // Semua rute yang didefinisikan di dalam router ini akan diawali dengan '/api/orders'
  app.use("/api/orders", router);
};
