//app/middleware/authJwt.js
const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth.config");
const db = require("../models");
const User = db.users;

// Middleware untuk memverifikasi token
exports.verifyToken = (req, res, next) => {
  // Ambil token dari berbagai kemungkinan header
  let token =
    req.headers["x-access-token"] ||
    req.headers["authorization"] ||
    req.headers["Authorization"];

  // Only log in development
  if (process.env.NODE_ENV === "development") {
    console.log("Token received:", token ? "Present" : "Missing");
  }

  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("JWT verify error:", err.message);
      }
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    req.userRoles = decoded.roles; // Simpan peran pengguna di request
    next();
  });
};

// Middleware untuk memeriksa peran Admin
exports.isAdmin = (req, res, next) => {
  if (!req.userRoles || !req.userRoles.includes("admin")) {
    return res.status(403).send({ message: "Require Admin Role!" });
  }
  next();
};

// Middleware untuk memeriksa peran User (opsional, jika ada peran 'user' spesifik)
exports.isUser = (req, res, next) => {
  if (!req.userRoles || !req.userRoles.includes("user")) {
    return res.status(403).send({ message: "Require User Role!" });
  }
  next();
};
