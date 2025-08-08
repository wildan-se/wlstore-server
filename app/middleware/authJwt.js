//app/middleware/authJwt.js
const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth.config");
const db = require("../models");
const User = db.users;

// Enhanced error response helper
function sendAuthError(res, status, message, errorType, details = {}) {
  const errorResponse = {
    success: false,
    message,
    errorType,
    timestamp: new Date(),
    ...details,
  };

  console.error(`❌ Auth Error [${status}]:`, errorResponse);
  return res.status(status).json(errorResponse);
}

// Enhanced middleware untuk memverifikasi token
exports.verifyToken = async (req, res, next) => {
  try {
    // Ambil token dari berbagai kemungkinan header
    let token =
      req.headers["x-access-token"] ||
      req.headers["authorization"] ||
      req.headers["Authorization"];

    console.log("🔍 Token verification attempt:");
    console.log("- IP:", req.ip);
    console.log("- User-Agent:", req.get("User-Agent"));
    console.log("- Token present:", token ? "Yes" : "No");

    // Extract Bearer token
    if (token && token.startsWith("Bearer ")) {
      token = token.slice(7, token.length);
    }

    if (!token) {
      return sendAuthError(res, 403, "No token provided!", "missing_token", {
        suggestion:
          "Please include a valid JWT token in the Authorization header",
      });
    }

    // Special handling for demo token
    if (token === "demo-admin-token") {
      console.log("✅ Demo admin token detected");
      req.userId = "demo-admin-id";
      req.userRoles = ["admin", "user"];
      req.userInfo = {
        id: "demo-admin-id",
        username: "demo-admin",
        email: "demo@admin.com",
        name: "Demo Admin",
        roles: ["admin", "user"],
      };
      return next();
    }

    // Enhanced JWT verification
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, authConfig.secret, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // Enhanced token validation
    if (!decoded.id) {
      return sendAuthError(res, 401, "Invalid token format", "invalid_token", {
        reason: "Token missing user ID",
      });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.id).select(
      "username email name roles isActive accountLocked lastLogin"
    );

    if (!user) {
      return sendAuthError(res, 401, "User not found", "user_not_found", {
        userId: decoded.id,
      });
    }

    if (!user.isActive) {
      return sendAuthError(
        res,
        403,
        "Account is deactivated",
        "account_inactive",
        {
          userId: decoded.id,
        }
      );
    }

    if (user.accountLocked) {
      return sendAuthError(res, 403, "Account is locked", "account_locked", {
        userId: decoded.id,
        suggestion: "Contact administrator to unlock your account",
      });
    }

    // Update last seen timestamp
    await User.findByIdAndUpdate(decoded.id, {
      lastSeen: new Date(),
      $inc: { loginCount: 0 }, // Initialize if doesn't exist
    });

    console.log("✅ Token verified successfully");
    console.log("- User ID:", decoded.id);
    console.log("- Username:", user.username);
    console.log("- Roles:", user.roles);

    // Attach enhanced user info to request
    req.userId = decoded.id;
    req.userRoles = user.roles;
    req.userInfo = {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      roles: user.roles,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    next();
  } catch (error) {
    console.error("❌ JWT verification error:", error);

    if (error.name === "TokenExpiredError") {
      // Only log once per minute for expired tokens to reduce spam
      const now = Date.now();
      const lastLogKey = `expired_token_${req.ip}_${req.path}`;
      if (!global.lastTokenExpiredLog) global.lastTokenExpiredLog = {};
      if (
        !global.lastTokenExpiredLog[lastLogKey] ||
        now - global.lastTokenExpiredLog[lastLogKey] > 60000
      ) {
        console.log(`🔑 Token expired for ${req.path} from ${req.ip}`);
        global.lastTokenExpiredLog[lastLogKey] = now;
      }

      return sendAuthError(res, 401, "Token has expired", "token_expired", {
        expiredAt: error.expiredAt,
        suggestion: "Please login again to get a new token",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return sendAuthError(res, 401, "Invalid token", "invalid_token", {
        reason: error.message,
      });
    }

    if (error.name === "NotBeforeError") {
      return sendAuthError(
        res,
        401,
        "Token not active yet",
        "token_not_active",
        {
          date: error.date,
        }
      );
    }

    // Database or other errors
    return sendAuthError(
      res,
      500,
      "Token verification failed",
      "verification_error",
      {
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      }
    );
  }
};

// Enhanced middleware untuk memeriksa peran Admin
exports.isAdmin = (req, res, next) => {
  try {
    console.log("🔍 Admin role verification:");
    console.log("- User ID:", req.userId);
    console.log("- User Roles:", req.userRoles);
    console.log("- Has admin role:", req.userRoles?.includes("admin"));

    if (!req.userRoles || !Array.isArray(req.userRoles)) {
      return sendAuthError(res, 403, "Invalid user roles", "invalid_roles", {
        suggestion: "Token verification may have failed",
      });
    }

    if (!req.userRoles.includes("admin")) {
      return sendAuthError(
        res,
        403,
        "Admin role required",
        "insufficient_privileges",
        {
          userRoles: req.userRoles,
          requiredRole: "admin",
          suggestion: "Contact administrator for role upgrade",
        }
      );
    }

    console.log("✅ Admin role verified for user:", req.userId);
    next();
  } catch (error) {
    console.error("❌ Admin check error:", error);
    return sendAuthError(
      res,
      500,
      "Role verification failed",
      "role_check_error"
    );
  }
};

// Enhanced middleware untuk memeriksa peran User
exports.isUser = (req, res, next) => {
  try {
    console.log("🔍 User role verification:");
    console.log("- User ID:", req.userId);
    console.log("- User Roles:", req.userRoles);

    if (!req.userRoles || !Array.isArray(req.userRoles)) {
      return sendAuthError(res, 403, "Invalid user roles", "invalid_roles");
    }

    if (!req.userRoles.includes("user")) {
      return sendAuthError(
        res,
        403,
        "User role required",
        "insufficient_privileges",
        {
          userRoles: req.userRoles,
          requiredRole: "user",
        }
      );
    }

    console.log("✅ User role verified for user:", req.userId);
    next();
  } catch (error) {
    console.error("❌ User check error:", error);
    return sendAuthError(
      res,
      500,
      "Role verification failed",
      "role_check_error"
    );
  }
};

// New middleware for admin or owner access
exports.isAdminOrOwner = (req, res, next) => {
  try {
    const isAdmin = req.userRoles?.includes("admin");
    const isOwner =
      req.userId === req.params.userId || req.userId === req.body.userId;

    console.log("🔍 Admin or Owner verification:");
    console.log("- User ID:", req.userId);
    console.log("- Is Admin:", isAdmin);
    console.log("- Is Owner:", isOwner);

    if (!isAdmin && !isOwner) {
      return sendAuthError(
        res,
        403,
        "Admin role or resource ownership required",
        "insufficient_privileges",
        {
          userRoles: req.userRoles,
          requiredRole: "admin or owner",
        }
      );
    }

    console.log("✅ Admin/Owner role verified");
    next();
  } catch (error) {
    console.error("❌ Admin/Owner check error:", error);
    return sendAuthError(
      res,
      500,
      "Role verification failed",
      "role_check_error"
    );
  }
};
