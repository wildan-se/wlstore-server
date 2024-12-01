module.exports = (app) => {
  const orders = require("../controllers/order.controller");

  // Membuat instance Router dari Express
  const router = require("express").Router();

  router.get("/user/:id", orders.findOrder);
  router.post("/user/:id/add", orders.addToCart);
  router.delete("/user/:id/product/:product", orders.removeFromCart);

  app.use("/api/orders", router);
};
