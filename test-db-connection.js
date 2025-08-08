// Test database connection
const mongoose = require("mongoose");
const dbConfig = require("./config/db.config");

console.log("Testing database connection...");
console.log("DB URL:", dbConfig.url);

mongoose
  .connect(dbConfig.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Database connection successful!");
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    console.log("❌ Database connection failed:");
    console.error(error);
    process.exit(1);
  });
