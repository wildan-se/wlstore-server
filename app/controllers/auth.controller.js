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
    const { username, email, password, name, phone } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).send({
        message: "Username, email, password, and name are required!",
      });
    }

    // 2. Validasi password strength
    if (password.length < 6) {
      return res.status(400).send({
        message: "Password must be at least 6 characters long!",
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Buat user baru
    const user = new User({
      username,
      email,
      password: hashedPassword,
      name,
      phone: phone || "",
      roles: req.body.roles ? req.body.roles : ["user"],
      isActive: true,
    });

    // 5. Simpan user ke database
    const savedUser = await user.save();

    // 6. Generate token untuk auto-login setelah register
    const token = jwt.sign(
      { id: savedUser.id, roles: savedUser.roles },
      authConfig.secret,
      { expiresIn: authConfig.jwtExpiration }
    );

    res.status(201).send({
      message: "User registered successfully!",
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        name: savedUser.name,
        phone: savedUser.phone,
        roles: savedUser.roles,
      },
      accessToken: token,
      expiresIn: authConfig.jwtExpiration,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).send({
        message: `Registration failed: ${field} '${err.keyValue[field]}' is already taken.`,
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
    const { username, email, password } = req.body;

    if (!password || (!username && !email)) {
      return res.status(400).send({
        message: "Password and either username or email are required!",
      });
    }

    // 2. Cari user berdasarkan username atau email
    const query = username ? { username } : { email };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // 3. Check if user is active
    if (!user.isActive) {
      return res.status(401).send({ message: "Account is deactivated." });
    }

    // 4. Bandingkan password
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: "Invalid password!",
      });
    }

    // 5. Buat JWT
    const token = jwt.sign(
      { id: user.id, roles: user.roles },
      authConfig.secret,
      { expiresIn: authConfig.jwtExpiration }
    );

    res.status(200).send({
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      phone: user.phone,
      roles: user.roles,
      accessToken: token,
      expiresIn: authConfig.jwtExpiration,
    });
  } catch (err) {
    console.error("Error during signin:", err);
    res.status(500).send({
      message: err.message || "An error occurred during login.",
    });
  }
};
