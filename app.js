// Mengimpor module Express untuk membuat aplikasi server
const express = require("express");
// Membuat instance aplikasi Express
const app = express();

// Mengimpor module path untuk menangani path file
const path = require("path");
// Mengimpor module CORS untuk mengizinkan permintaan lintas domain
const cors = require("cors");
// Menentukan port yang akan digunakan untuk server
const PORT = process.env.PORT || 8000; // Jika variabel lingkungan PORT tidak ada, default ke 8000

// Middleware untuk mengonfigurasi aplikasi agar menerima format JSON pada body request
app.use(express.json());
// Middleware untuk mengonfigurasi aplikasi agar dapat menerima data URL-encoded (misalnya formulir)
app.use(express.urlencoded({ extended: true }));
// Menyajikan file gambar statis dari folder 'public/img' ketika diakses melalui /img
app.use("/img", express.static(path.join(__dirname, "./public/img")));
// Menggunakan CORS middleware untuk memungkinkan permintaan lintas domain
app.use(cors());
// Middleware untuk menambahkan header CORS khusus pada setiap respons
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // Mengizinkan semua domain mengakses server
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept" // Menentukan header yang diizinkan dalam permintaan
  );
  next(); // Melanjutkan ke middleware berikutnya
});

// Mengimpor konfigurasi database dan menghubungkan ke MongoDB menggunakan Mongoose
const db = require("./app/models");
// Menghubungkan ke MongoDB dengan pengaturan koneksi yang diperlukan
db.mongoose
  .connect(db.url, {
    useNewUrlParser: true, // Menggunakan URL parser baru
    useUnifiedTopology: true, // Menggunakan koneksi topology yang lebih stabil
    useFindAndModify: false, // Menonaktifkan penggunaan findAndModify yang sudah deprecated
  })
  .then((result) => {
    console.log("connect to database"); // Jika koneksi berhasil
  })
  .catch((err) => {
    console.error("Connection error:", err); // Menangani kesalahan koneksi ke database
    process.exit(); // Menutup aplikasi jika koneksi gagal
  });

// Rute dasar untuk mengembalikan pesan sambutan ketika mengakses root URL
app.get("/", (req, res) => {
  res.json({
    message: "welcome wlstore-server", // Pesan sambutan untuk aplikasi
  });
});

// Mengimpor dan mengonfigurasi rute untuk produk dan pesanan
require("./app/routes/product.route")(app); // Mengonfigurasi rute produk
require("./app/routes/order.route")(app); // Mengonfigurasi rute pesanan

// Menjalankan server pada port yang ditentukan dan mencetak pesan ketika server siap
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`); // Menampilkan pesan saat server aktif
});
