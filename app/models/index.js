// Mengimpor konfigurasi database dari file 'db.config' untuk mendapatkan URL koneksi
const dbConfig = require("../../config/db.config");
// Mengimpor mongoose untuk berinteraksi dengan database MongoDB
const mongoose = require("mongoose");

// Menetapkan Promise global untuk mongoose, yang akan digunakan untuk menangani operasi asinkron
mongoose.Promise = global.Promise;

// Membuat objek kosong untuk menyimpan referensi ke database dan model-model
const db = {};

// Menyimpan referensi ke mongoose untuk digunakan di seluruh aplikasi
db.mongoose = mongoose;
// Menyimpan URL koneksi database yang diambil dari konfigurasi
db.url = dbConfig.url;
// Mengimpor model produk dan menyambungkan model dengan mongoose
db.products = require("./product.model")(mongoose);
// Mengimpor model pesanan dan menyambungkan model dengan mongoose
db.orders = require("./order.model")(mongoose);

// Mengeksport objek db yang berisi referensi ke mongoose dan model-model yang digunakan di aplikasi
module.exports = db;
