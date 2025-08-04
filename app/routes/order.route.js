// app/routes/order.route.js
module.exports = (app) => {
  const orders = require("../controllers/order.controller");
  const router = require("express").Router();
  const { verifyToken } = require("../middleware/authJwt"); // Import middleware

  // Rute untuk mendapatkan keranjang belanja pengguna (membutuhkan otentikasi)
  router.get("/cart", [verifyToken], orders.findUserCart);

  // Rute untuk menambah/memperbarui item ke keranjang (membutuhkan otentikasi)
  router.post("/cart/add", [verifyToken], orders.addToCart);

  // Rute untuk memperbarui kuantitas item di keranjang (membutuhkan otentikasi)
  router.put(
    "/cart/update-quantity",
    [verifyToken],
    orders.updateCartItemQuantity
  );

  // Rute untuk menghapus item dari keranjang (membutuhkan otentikasi)
  router.post("/cart/remove", [verifyToken], orders.removeFromCart);
  // Atau jika Anda ingin menggunakan DELETE method:
  // router.delete("/cart/remove/:productCode", [verifyToken], orders.removeFromCart);

  // Rute lain yang mungkin sudah ada (misalnya untuk manajemen pesanan admin)
  // router.get("/", orders.findAll); // Contoh: untuk admin melihat semua order
  // router.get("/:id", orders.findOne); // Contoh: untuk admin melihat detail order
  // router.put("/:id", orders.update); // Contoh: untuk admin mengubah status order
  // router.delete("/:id", orders.delete); // Contoh: untuk admin menghapus order

  app.use("/api/orders", router);
};
