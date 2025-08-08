// app.js - Enhanced with comprehensive error handling and production features
const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable for development, enable in production
  })
);

// Enhanced rate limiting (exclude health check)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "production" ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    errorType: "rate_limit",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check and root endpoint
    return req.path === "/api/health" || req.path === "/";
  },
});

app.use(limiter);

// Enhanced body parsing with size limits
app.use(
  express.json({
    limit: process.env.JSON_LIMIT || "10mb",
    strict: true,
    type: "application/json",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.URL_ENCODED_LIMIT || "10mb",
  })
);

// Static file serving with proper headers
app.use(
  "/img",
  express.static(path.join(__dirname, "./public/img"), {
    maxAge: NODE_ENV === "production" ? "1d" : "1h",
    etag: true,
  })
);
app.use(
  "/uploads",
  express.static(path.join(__dirname, "./public/uploads"), {
    maxAge: NODE_ENV === "production" ? "1d" : "1h",
    etag: true,
  })
);

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  credentials: process.env.CORS_CREDENTIALS === "true",
  optionsSuccessStatus: 204,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-access-token",
    "Cache-Control",
    "Pragma",
    "Expires",
    "Last-Modified",
    "If-Modified-Since",
    "If-None-Match",
  ],
};
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Enhanced multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public", "uploads");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, file.fieldname + "-" + uniqueSuffix + "-" + sanitizedName);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 5, // Max 5 files
    fields: 10, // Max 10 non-file fields
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          `File type ${
            file.mimetype
          } not allowed. Allowed types: ${allowedMimeTypes.join(", ")}`
        ),
        false
      );
    }

    cb(null, true);
  },
});

app.set("upload", upload);

// Enhanced database connection with retry logic
const db = require("./app/models");

const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await db.mongoose.connect(db.url, {
        ...db.options,
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
      });

      console.log("✅ Connected to the database!");

      // Enhanced database health check
      const dbStats = await db.mongoose.connection.db.stats();
      console.log(`📊 Database Stats:`, {
        collections: dbStats.collections,
        dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        indexSize: `${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      });

      // Enhanced admin user seeding
      const userCount = await db.users.estimatedDocumentCount();
      if (userCount === 0) {
        console.log("👤 No users found. Seeding initial admin user...");
        const bcrypt = require("bcryptjs");
        const User = db.users;

        const adminUser = new User({
          username: "admin",
          email: "admin@wlstore.com",
          name: "Administrator",
          phone: "08123456789",
          password: bcrypt.hashSync("admin123", 12),
          roles: ["admin", "user"],
          isActive: true,
          createdAt: new Date(),
          lastLogin: null,
          loginAttempts: 0,
          accountLocked: false,
        });

        const savedAdmin = await adminUser.save();
        console.log("✅ Default admin user created:");
        console.log("📧 Email: admin@wlstore.com");
        console.log("🔑 Password: admin123");
        console.log("👤 Username: admin");
        console.log("🆔 ID:", savedAdmin._id);
      } else {
        console.log(`👥 Found ${userCount} existing users in database`);
      }

      return; // Successfully connected
    } catch (error) {
      console.error(
        `❌ Database connection attempt ${i + 1}/${retries} failed:`,
        error.message
      );

      if (i === retries - 1) {
        console.error("💥 All database connection attempts failed. Exiting...");
        process.exit(1);
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, i), 30000); // Max 30 seconds
      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Connect to database
connectDB();

// Database event listeners
db.mongoose.connection.on("error", (error) => {
  console.error("❌ Database error:", error);
});

db.mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ Database disconnected");
});

db.mongoose.connection.on("reconnected", () => {
  console.log("🔄 Database reconnected");
});

// Enhanced API root endpoint
app.get("/", (req, res) => {
  const serverInfo = {
    success: true,
    message: "Welcome to WLstore API!",
    version: process.env.npm_package_version || "1.0.0",
    environment: NODE_ENV,
    timestamp: new Date(),
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      orders: "/api/orders",
      admin: "/api/admin",
      users: "/api/users",
      health: "/api/health",
    },
    status: "operational",
  };

  res.json(serverInfo);
});

// Health check endpoint (no rate limiting)
app.get("/api/health", (req, res) => {
  try {
    const healthStatus = {
      status: "OK",
      timestamp: new Date(),
      services: {
        database:
          db.mongoose.connection.readyState === 1
            ? "connected"
            : "disconnected",
        server: "running",
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      version: process.env.npm_package_version || "1.0.0",
      environment: NODE_ENV,
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date(),
      error: error.message,
      services: {
        database: "unknown",
        server: "error",
      },
    });
  }
});

// API routes with enhanced error handling
require("./app/routes/auth.route")(app); // Authentication routes
require("./app/routes/product.route")(app); // Product routes
require("./app/routes/order.route")(app); // Order routes
require("./app/routes/user.route")(app); // User profile routes
require("./app/routes/admin.route")(app); // Admin dashboard routes

// Global 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    errorType: "route_not_found",
    timestamp: new Date(),
    suggestion: "Check the API documentation for available endpoints",
  });
});

// Enhanced global error handler
app.use((error, req, res, next) => {
  console.error("🚨 Global error handler:", error);

  // Multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large",
        errorType: "file_size_limit",
        maxSize: process.env.MAX_FILE_SIZE || "5MB",
      });
    }

    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files",
        errorType: "file_count_limit",
        maxFiles: 5,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
      errorType: "file_upload_error",
    });
  }

  // JSON parsing errors
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format",
      errorType: "json_parse_error",
    });
  }

  // Rate limit errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests",
      errorType: "rate_limit_exceeded",
      retryAfter: error.retryAfter || "15 minutes",
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
    errorType: error.errorType || "internal_server_error",
    timestamp: new Date(),
    ...(NODE_ENV === "development" && { stack: error.stack }),
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      console.error("❌ Error during server shutdown:", err);
      process.exit(1);
    }

    try {
      await db.mongoose.connection.close();
      console.log("✅ Database connection closed");
      console.log("👋 Server shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error closing database connection:", error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("💥 Force shutdown after timeout");
    process.exit(1);
  }, 30000);
};

// Enhanced server startup
const server = app.listen(PORT, () => {
  const serverInfo = {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version,
    timestamp: new Date(),
    pid: process.pid,
  };

  console.log("🚀 Server started successfully!");
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🔧 Node.js: ${process.version}`);
  console.log(`🆔 Process ID: ${process.pid}`);

  if (NODE_ENV === "development") {
    console.log("\n📚 API Documentation:");
    console.log(`   Root: http://localhost:${PORT}/`);
    console.log(`   Auth: http://localhost:${PORT}/api/auth`);
    console.log(`   Products: http://localhost:${PORT}/api/products`);
    console.log(`   Orders: http://localhost:${PORT}/api/orders`);
    console.log(`   Admin: http://localhost:${PORT}/api/admin`);
  }
});

// Handle server errors
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error("❌ Server error:", error);
    process.exit(1);
  }
});

// Graceful shutdown listeners
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});
