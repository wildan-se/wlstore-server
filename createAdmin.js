// createAdmin.js
const db = require("./app/models");
const User = db.users;
const bcrypt = require("bcryptjs");

const createAdminUser = async () => {
  try {
    // Connect to database
    await db.mongoose.connect(
      `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Connected to database");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.username);
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      username: "admin",
      email: "admin@wlstore.com",
      password: bcrypt.hashSync("admin123", 8),
      name: "Administrator",
      phone: "081234567890",
      roles: ["admin"],
      isActive: true,
    });

    await adminUser.save();
    console.log("✅ Admin user created successfully!");
    console.log("📧 Email: admin@wlstore.com");
    console.log("🔑 Password: admin123");
    console.log("👤 Username: admin");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
};

createAdminUser();
