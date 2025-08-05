const db = require("./app/models/index.js");
const bcrypt = require("bcryptjs");

// Debug script untuk melihat user admin dan reset password jika perlu
async function debugAdminUser() {
  try {
    // Connect to database
    await db.mongoose.connect("mongodb://localhost:27017/collect_wlstore", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to the database!");

    const User = db.users;

    // Find admin user
    const adminUser = await User.findOne({ email: "admin@wlstore.com" });

    if (adminUser) {
      console.log("Admin user found:");
      console.log("ID:", adminUser._id);
      console.log("Username:", adminUser.username);
      console.log("Email:", adminUser.email);
      console.log("Name:", adminUser.name);
      console.log("Roles:", adminUser.roles);
      console.log("IsActive:", adminUser.isActive);
      console.log("Password Hash:", adminUser.password);

      // Test if password matches
      const isMatch = await bcrypt.compare("admin123", adminUser.password);
      console.log("Password 'admin123' matches:", isMatch);

      if (!isMatch) {
        console.log("Resetting admin password to 'admin123'...");
        adminUser.password = bcrypt.hashSync("admin123", 8);
        adminUser.name = adminUser.name || "Administrator"; // Add missing name
        await adminUser.save();
        console.log("Admin password reset successfully!");
      }
    } else {
      console.log("Admin user not found. Creating new admin user...");
      const newAdmin = new User({
        username: "admin",
        email: "admin@wlstore.com",
        name: "Administrator",
        phone: "08123456789",
        password: bcrypt.hashSync("admin123", 8),
        roles: ["admin", "user"],
        isActive: true,
      });
      await newAdmin.save();
      console.log("New admin user created!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugAdminUser();
