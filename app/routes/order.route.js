// app/routes/order.route.js
module.exports = (app) => {
  const orders = require("../controllers/order.controller");
  const router = require("express").Router();
  const { authJwt } = require("../middleware"); // Import middleware

  // Rute untuk mendapatkan keranjang belanja pengguna (membutuhkan otentikasi)
  router.get("/cart", [authJwt.verifyToken], orders.findUserCart);

  // Rute untuk menambah/memperbarui item ke keranjang (membutuhkan otentikasi)
  router.post("/cart/add", [authJwt.verifyToken], orders.addToCart);

  // Rute untuk memperbarui kuantitas item di keranjang (membutuhkan otentikasi)
  router.put(
    "/cart/update-quantity",
    [authJwt.verifyToken],
    orders.updateCartItemQuantity
  );

  // Rute untuk menghapus item dari keranjang (membutuhkan otentikasi)
  router.post("/cart/remove", [authJwt.verifyToken], orders.removeFromCart);

  // === ADMIN ROUTES FOR ORDER MANAGEMENT ===

  // Admin: Get all orders with pagination and filtering
  router.get(
    "/admin/all",
    [authJwt.verifyToken, authJwt.isAdmin],
    orders.getAllOrders
  );

  // Admin: Get order statistics
  router.get(
    "/admin/stats",
    [authJwt.verifyToken, authJwt.isAdmin],
    orders.getOrderStats
  );

  // Admin: Update order status
  router.put(
    "/admin/:orderId/status",
    [authJwt.verifyToken, authJwt.isAdmin],
    orders.updateOrderStatus
  );

  // Admin: Delete order
  router.delete(
    "/admin/:orderId",
    [authJwt.verifyToken, authJwt.isAdmin],
    orders.deleteOrder
  );

  app.use("/api/orders", router);
};
