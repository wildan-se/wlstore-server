const mongoose = require("mongoose");

// Test MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/collect_wlstore", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connection successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.log("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  });
