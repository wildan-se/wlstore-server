// config/email.config.js
module.exports = {
  gmail: {
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true untuk 465, false untuk port lain
    auth: {
      user: process.env.GMAIL_USER, // Email Gmail Anda
      pass: process.env.GMAIL_APP_PASSWORD, // App Password Gmail
    },
  },
  emailTemplates: {
    resetPassword: {
      subject: "🔒 Reset Password - WLStore",
      from: (userEmail) => `"WLStore" <${userEmail}>`,
    },
  },
};
