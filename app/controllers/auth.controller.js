// app/controllers/auth.controller.js
const db = require("../models");
const User = db.users;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authConfig = require("../../config/auth.config");
const nodemailer = require("nodemailer");
const emailConfig = require("../../config/email.config");
const mongoose = require("mongoose");

// Import admin controller untuk activity logging
const { addActivity } = require("./admin.controller");

// Enhanced error handling helper
function handleAuthError(error, res, functionName) {
  console.error(`❌ Error in ${functionName}:`, error);

  // Handle validation errors
  if (error.name === "ValidationError") {
    const validationErrors = Object.values(error.errors).map(
      (err) => err.message
    );
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validationErrors,
      errorType: "validation",
    });
  }

  // Handle duplicate key errors (username/email already exists)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    return res.status(409).json({
      success: false,
      message: `${field} '${value}' already exists`,
      errorType: "duplicate",
      field,
      value,
    });
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      errorType: "jwt",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
      errorType: "jwt_expired",
    });
  }

  // Handle bcrypt errors
  if (error.message && error.message.includes("bcrypt")) {
    return res.status(500).json({
      success: false,
      message: "Password processing failed",
      errorType: "bcrypt",
    });
  }

  // Handle email errors
  if (error.code && (error.code === "EAUTH" || error.code === "ECONNECTION")) {
    return res.status(500).json({
      success: false,
      message: "Email service unavailable",
      errorType: "email",
    });
  }

  // Default error handler
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    errorType: "internal",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
}

// Enhanced user registration with comprehensive validation
exports.signup = async (req, res) => {
  try {
    const { username, email, password, name, phone } = req.body;
    console.log(`👤 New user registration attempt: ${email}`);

    // Enhanced input validation
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, and name are required!",
        errorType: "validation",
        missingFields: [
          !username && "username",
          !email && "email",
          !password && "password",
          !name && "name",
        ].filter(Boolean),
      });
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
        errorType: "validation",
      });
    }

    // Enhanced username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be 3-20 characters long and contain only letters, numbers, and underscores",
        errorType: "validation",
      });
    }

    // Enhanced password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long!",
        errorType: "validation",
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password too long (max 128 characters)",
        errorType: "validation",
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const duplicateField =
        existingUser.email === email ? "email" : "username";
      return res.status(409).json({
        success: false,
        message: `${duplicateField} already exists`,
        errorType: "duplicate",
        field: duplicateField,
        value: duplicateField === "email" ? email : username,
      });
    }

    // Enhanced password hashing
    const saltRounds = process.env.BCRYPT_SALT_ROUNDS
      ? parseInt(process.env.BCRYPT_SALT_ROUNDS)
      : 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with enhanced data
    const userData = {
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      phone: phone?.trim() || "",
      roles: req.body.roles ? req.body.roles : ["user"],
      isActive: true,
      createdAt: new Date(),
      lastLogin: null,
      loginAttempts: 0,
      accountLocked: false,
    };

    const user = new User(userData);
    const savedUser = await user.save();

    // Generate enhanced JWT token
    const tokenPayload = {
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      roles: savedUser.roles,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(tokenPayload, authConfig.secret, {
      expiresIn: authConfig.jwtExpiration,
    });

    // Enhanced activity logging
    const activityId = addActivity(
      "user",
      `User baru berhasil mendaftar: ${savedUser.name} (${savedUser.email})`,
      {
        userId: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        name: savedUser.name,
        phone: savedUser.phone,
        roles: savedUser.roles,
        timestamp: new Date(),
        actionType: "register",
        severity: "info",
        source: "registration_form",
        userAgent: req.get("User-Agent"),
        ipAddress: req.ip,
      }
    );

    console.log(
      `✅ User registered: ${savedUser.email} (Activity: ${activityId})`
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      data: {
        user: {
          id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          name: savedUser.name,
          phone: savedUser.phone,
          roles: savedUser.roles,
          isActive: savedUser.isActive,
        },
        accessToken: token,
        tokenType: "Bearer",
        expiresIn: authConfig.jwtExpiration,
      },
      activityId,
    });
  } catch (error) {
    return handleAuthError(error, res, "signup");
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

// Buat transporter Gmail
const createGmailTransporter = () => {
  return nodemailer.createTransport(emailConfig.gmail);
};

// Generate HTML template untuk reset password
const generateResetPasswordHTML = (user, resetToken) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password - WLStore</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 40px 30px; }
        .content h2 { color: #333; margin: 0 0 20px 0; font-size: 24px; }
        .content p { color: #666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px; }
        .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; transition: transform 0.2s; }
        .button:hover { transform: translateY(-2px); }
        .info-box { background: #f8f9ff; border: 1px solid #e1e5f2; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-box h3 { color: #5a67d8; margin: 0 0 10px 0; font-size: 18px; }
        .info-box p { color: #4a5568; margin: 0; }
        .warning { background: #fff5f5; border: 1px solid #fed7d7; color: #c53030; }
        .footer { background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { margin: 0; color: #718096; font-size: 14px; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .security-notice { background: #edf2f7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .security-notice p { margin: 0; font-size: 14px; color: #4a5568; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🛒 WLStore</div>
          <h1>Reset Password</h1>
          <p>Permintaan reset password untuk akun Anda</p>
        </div>
        
        <div class="content">
          <h2>Halo ${user.name || user.username}!</h2>
          <p>Kami menerima permintaan untuk reset password akun WLStore Anda yang terdaftar dengan email <strong>${
            user.email
          }</strong>.</p>
          
          <p>Jika Anda yang membuat permintaan ini, silakan klik tombol di bawah untuk melanjutkan proses reset password:</p>
          
          <div style="text-align: center;">
            <a href="http://localhost:5173/reset-password?token=${resetToken}" class="button">
              🔒 Reset Password Saya
            </a>
          </div>
          
          <div class="info-box">
            <h3>📋 Informasi Penting</h3>
            <p><strong>Link ini akan kedaluwarsa dalam 1 jam</strong> setelah email ini dikirim untuk menjaga keamanan akun Anda.</p>
          </div>
          
          <div class="info-box warning">
            <h3>⚠️ Peringatan Keamanan</h3>
            <p>Jika Anda TIDAK membuat permintaan reset password ini, silakan abaikan email ini. Password Anda tidak akan berubah sampai Anda mengakses link di atas dan membuat password baru.</p>
          </div>
          
          <div class="security-notice">
            <p><strong>Tips Keamanan:</strong> Pastikan Anda membuat password yang kuat dengan kombinasi huruf besar, huruf kecil, angka, dan simbol untuk melindungi akun Anda.</p>
          </div>
          
          <p>Jika Anda mengalami kesulitan mengklik tombol di atas, Anda juga dapat menyalin dan paste link berikut ke browser Anda:</p>
          <p style="word-break: break-all; background: #f7fafc; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 14px;">
            http://localhost:5173/reset-password?token=${resetToken}
          </p>
        </div>
        
        <div class="footer">
          <p><strong>WLStore</strong> - Platform E-commerce Terpercaya</p>
          <p>© 2025 WLStore. Semua hak dilindungi.</p>
          <p style="margin-top: 10px; font-size: 12px;">
            Email ini dikirim secara otomatis. Mohon jangan membalas email ini.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Fungsi untuk lupa password
exports.forgotPassword = async (req, res) => {
  try {
    // 1. Validasi input
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required!",
      });
    }

    // 2. Cari user berdasarkan email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send({
        success: false,
        message:
          "Email tidak ditemukan dalam sistem kami. Silakan periksa kembali email Anda.",
      });
    }

    // 3. Check if user is active
    if (!user.isActive) {
      return res.status(401).send({
        success: false,
        message:
          "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.",
      });
    }

    // 4. Generate reset token yang aman
    const resetToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        purpose: "password_reset",
      },
      authConfig.secret,
      { expiresIn: "1h" } // Token berlaku 1 jam
    );

    // 5. Setup Gmail transporter
    const transporter = createGmailTransporter();

    // 6. Generate email HTML
    const emailHTML = generateResetPasswordHTML(user, resetToken);

    // 7. Setup email options
    const mailOptions = {
      from: emailConfig.emailTemplates.resetPassword.from(
        process.env.GMAIL_USER
      ),
      to: email,
      subject: emailConfig.emailTemplates.resetPassword.subject,
      html: emailHTML,
    };

    // 8. Kirim email
    await transporter.sendMail(mailOptions);

    console.log(`✅ Reset password email sent successfully to: ${email}`);
    console.log(
      `🔗 Reset token generated for user: ${user.username} (${user._id})`
    );

    res.status(200).send({
      success: true,
      message:
        "Link reset password telah dikirim ke email Anda. Silakan periksa inbox dan folder spam Anda.",
      email: email,
    });
  } catch (error) {
    console.error("❌ Error sending reset password email:", error);

    // Handle specific email errors
    if (error.code === "EAUTH") {
      return res.status(500).send({
        success: false,
        message:
          "Konfigurasi email server bermasalah. Silakan hubungi administrator.",
      });
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNECTION") {
      return res.status(500).send({
        success: false,
        message:
          "Tidak dapat terhubung ke server email. Silakan coba lagi nanti.",
      });
    }

    res.status(500).send({
      success: false,
      message:
        "Terjadi kesalahan saat mengirim email. Silakan coba lagi nanti.",
    });
  }
};

// Fungsi untuk reset password dengan token
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // 1. Validasi input
    if (!token || !newPassword) {
      return res.status(400).send({
        success: false,
        message: "Token dan password baru harus diisi.",
      });
    }

    // 2. Validasi panjang password
    if (newPassword.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password harus minimal 6 karakter.",
      });
    }

    // 3. Verifikasi JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, authConfig.secret);
    } catch (error) {
      console.error("❌ Invalid or expired token:", error.message);
      return res.status(400).send({
        success: false,
        message:
          "Token tidak valid atau sudah kadaluarsa. Silakan minta reset password kembali.",
      });
    }

    // 4. Cari user berdasarkan ID dari token
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Pengguna tidak ditemukan.",
      });
    }

    // 5. Validasi purpose token
    if (decoded.purpose !== "password_reset") {
      return res.status(400).send({
        success: false,
        message: "Token tidak valid untuk reset password.",
      });
    }

    // 6. Hash password baru
    const hashedPassword = bcrypt.hashSync(newPassword, 8);

    // 7. Update password di database
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      updatedAt: new Date(),
    });

    console.log(
      `✅ Password reset successfully for user: ${user.username} (${user.email})`
    );

    // Log activity untuk reset password
    addActivity("user", `Password akun "${user.username}" berhasil direset`, {
      userId: user._id,
      username: user.username,
      email: user.email,
    });

    res.status(200).send({
      success: true,
      message:
        "Password berhasil direset. Anda sekarang dapat login dengan password baru.",
    });
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    res.status(500).send({
      success: false,
      message: "Terjadi kesalahan server. Silakan coba lagi nanti.",
    });
  }
};
