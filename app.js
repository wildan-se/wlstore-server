// app.js
const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");

dotenv.config();

const PORT = process.env.PORT || 8001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/img", express.static(path.join(__dirname, "./public/img")));
app.use("/uploads", express.static(path.join(__dirname, "./public/uploads")));

const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public", "uploads");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

app.set("upload", upload);

const db = require("./app/models");
db.mongoose
  .connect(db.url, db.options)
  .then(() => {
    console.log("Connected to the database!");

    // Seed admin user if no users exist
    db.users.estimatedDocumentCount().then((count) => {
      if (count === 0) {
        console.log("No users found. Seeding initial admin user...");
        const bcrypt = require("bcryptjs");
        const User = db.users;
        const adminUser = new User({
          username: "admin",
          email: "admin@wlstore.com",
          name: "Administrator",
          phone: "08123456789",
          password: bcrypt.hashSync("admin123", 8),
          roles: ["admin", "user"],
          isActive: true,
        });
        adminUser
          .save()
          .then(() => {
            console.log("✅ Default admin user created:");
            console.log("📧 Email: admin@wlstore.com");
            console.log("🔑 Password: admin123");
            console.log("👤 Username: admin");
          })
          .catch((err) =>
            console.error("❌ Error creating default admin user:", err)
          );
      }
    });
  })
  .catch((err) => {
    console.error("Connection error:", err);
    process.exit(1);
  });

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to WLstore API!",
  });
});

require("./app/routes/auth.route")(app); // Tambahkan rute autentikasi
require("./app/routes/product.route")(app);
require("./app/routes/order.route")(app);
require("./app/routes/user.route")(app); // User profile routes

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
