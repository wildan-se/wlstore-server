// app/controllers/auth.controller.js
const db = require("../models");
const User = db.users;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authConfig = require("../../config/auth.config");

// Fungsi untuk pendaftaran pengguna baru
exports.signup = async (req, res) => {
  try {
    // 1. Validasi input
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res
        .status(400)
        .send({ message: "Username, email, and password are required!" });
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // Salt rounds = 10

    // 3. Buat user baru
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      roles: req.body.roles ? req.body.roles : ["user"], // Default role 'user'
    });

    // 4. Simpan user ke database
    const savedUser = await user.save();
    res.status(201).send({
      message: "User registered successfully!",
      user: savedUser.toJSON(),
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).send({
        message: `Failed to register user: ${field} '${err.keyValue[field]}' is already in use.`,
      });
    }
    console.error("Error during signup:", err);
    res.status(500).send({
      message: err.message || "An error occurred during user registration.",
    });
  }
};

// Fungsi untuk login pengguna
exports.signin = async (req, res) => {
  try {
    // 1. Validasi input
    if (!req.body.username || !req.body.password) {
      return res
        .status(400)
        .send({ message: "Username and password are required!" });
    }

    // 2. Cari user berdasarkan username
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // 3. Bandingkan password
    const passwordIsValid = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!passwordIsValid) {
      return res
        .status(401)
        .send({ accessToken: null, message: "Invalid Password!" });
    }

    // 4. Buat JWT
    const token = jwt.sign(
      { id: user.id, roles: user.roles },
      authConfig.secret,
      {
        expiresIn: authConfig.jwtExpiration, // Token kadaluarsa dalam 1 jam
      }
    );

    res.status(200).send({
      id: user._id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      accessToken: token,
      expiresIn: authConfig.jwtExpiration, // Berikan info expiration ke frontend
    });
  } catch (err) {
    console.error("Error during signin:", err);
    res
      .status(500)
      .send({ message: err.message || "An error occurred during login." });
  }
};

// Demo login function - untuk testing tanpa database
exports.demoLogin = async (req, res) => {
  try {
    const { isAdmin } = req.body;

    // Create demo user data with valid ObjectIds
    const demoUser = {
      id: isAdmin ? "677a1234567890abcdef1234" : "677a1234567890abcdef5678", // Valid ObjectIds
      username: isAdmin ? "admin" : "demouser",
      email: isAdmin ? "admin@wlstore.com" : "user@wlstore.com",
      roles: isAdmin ? ["admin"] : ["user"],
    };

    // Create JWT with demo user data
    const token = jwt.sign(
      { id: demoUser.id, roles: demoUser.roles },
      authConfig.secret,
      {
        expiresIn: authConfig.jwtExpiration,
      }
    );

    res.status(200).send({
      id: demoUser.id,
      username: demoUser.username,
      email: demoUser.email,
      roles: demoUser.roles,
      accessToken: token,
      expiresIn: authConfig.jwtExpiration,
      message: `Demo ${isAdmin ? "admin" : "user"} login successful!`,
    });
  } catch (err) {
    console.error("Error during demo login:", err);
    res
      .status(500)
      .send({ message: err.message || "An error occurred during demo login." });
  }
};
