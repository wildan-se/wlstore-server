// app/routes/auth.route.js
module.exports = (app) => {
  const authController = require("../controllers/auth.controller");
  const router = require("express").Router();

  // Route untuk pendaftaran
  router.post("/signup", authController.signup);

  // Route untuk login
  router.post("/signin", authController.signin);

  // Route untuk demo login
  router.post("/demo-login", authController.demoLogin);

  app.use("/api/auth", router);
};
