// Test app startup
try {
  console.log("Starting app...");

  const express = require("express");
  const app = express();
  const path = require("path");
  const cors = require("cors");
  const dotenv = require("dotenv");

  dotenv.config();
  console.log("✅ Basic modules loaded");

  const PORT = process.env.PORT || 8001;
  console.log("✅ PORT configured:", PORT);

  // Test DB models
  console.log("Loading DB models...");
  const db = require("./app/models");
  console.log("✅ DB models loaded");

  // Test routes
  console.log("Loading routes...");
  require("./app/routes/auth.route");
  console.log("✅ Auth route loaded");

  require("./app/routes/product.route");
  console.log("✅ Product route loaded");

  require("./app/routes/order.route");
  console.log("✅ Order route loaded");

  require("./app/routes/user.route");
  console.log("✅ User route loaded");

  require("./app/routes/admin.route");
  console.log("✅ Admin route loaded");

  console.log("✅ All modules loaded successfully!");
} catch (error) {
  console.error("❌ Error during startup:");
  console.error(error);
  process.exit(1);
}
