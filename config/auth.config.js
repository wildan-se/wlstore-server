// config/auth.config.js
module.exports = {
  secret: "qwertyuiop", // Ganti dengan string acak yang lebih kuat di produksi
  jwtExpiration: 3600, // 1 jam (dalam detik)
  jwtRefreshExpiration: 86400, // 24 jam (dalam detik)
};
