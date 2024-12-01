// Mengimpor model dari folder '../models' untuk mengakses koleksi 'products' di database
const db = require("../models");
const Product = db.products;

// Fungsi untuk mendapatkan semua produk
exports.findAll = (req, res) => {
  // Menggunakan metode 'find' untuk mengambil semua dokumen dari koleksi 'products'
  Product.find()
    // Jika berhasil, mengirimkan hasil produk ke klien
    .then((result) => {
      res.send(result); // Mengirimkan array hasil produk
    })
    // Jika terjadi kesalahan saat mengambil produk, mengirimkan respons dengan status 409 dan pesan kesalahan
    .catch((err) => {
      res.status(409).send({
        message: err.message || "some error while retrieving product.", // Pesan kesalahan default jika err.message tidak tersedia
      });
    });
};

// Fungsi untuk menemukan satu produk berdasarkan kode produk
exports.findOne = (req, res) => {
  // Mencari satu produk berdasarkan kode produk yang diterima dari parameter URL
  Product.findOne({
    code: req.params.id, // Mencocokkan 'code' produk dengan parameter 'id' yang diberikan di URL
  })
    // Jika berhasil, mengirimkan hasil produk ke klien
    .then((result) => {
      res.send(result); // Mengirimkan produk yang ditemukan
    })
    // Jika terjadi kesalahan saat mencari produk, mengirimkan respons dengan status 409 dan pesan kesalahan
    .catch((err) => {
      res.status(409).send({
        message: err.message || "some error while retrieving product.", // Pesan kesalahan default jika err.message tidak tersedia
      });
    });
};
