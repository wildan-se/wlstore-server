// app/routes/user.route.js
module.exports = (app) => {
  const users = require("../controllers/user.controller");
  const router = require("express").Router();
  const { verifyToken } = require("../middleware/authJwt");

  // Get user profile
  router.get("/profile", [verifyToken], users.getProfile);

  // Update user profile
  router.put("/profile", [verifyToken], users.updateProfile);

  // Change password
  router.put("/change-password", [verifyToken], users.changePassword);

  // Address management
  router.post("/addresses", [verifyToken], users.addAddress);
  router.put("/addresses/:addressId", [verifyToken], users.updateAddress);
  router.delete("/addresses/:addressId", [verifyToken], users.deleteAddress);

  app.use("/api/users", router);
};
