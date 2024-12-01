// Mengimpor model dari folder '../models' untuk mengakses koleksi 'orders' di database
const db = require("../models");
const Order = db.orders;

// Fungsi untuk menangani permintaan menemukan pesanan berdasarkan ID pengguna
exports.findOrder = (req, res) => {
  // Mendapatkan parameter ID pengguna dari URL dan mengonversinya ke tipe Number
  const id = Number(req.params.id);
  // Validasi ID pengguna untuk memastikan itu adalah angka yang valid
  if (isNaN(id)) {
    // Jika ID tidak valid, mengirimkan respons status 400 dengan pesan kesalahan
    return res.status(400).send({ message: "Invalid user ID" });
  }

  // Menggunakan MongoDB Aggregation Framework untuk memproses data dengan dua tahap
  Order.aggregate([
    // Tahap 1: Filter dokumen untuk hanya mencocokkan dokumen dengan user_id yang sesuai
    {
      $match: {
        user_id: id, // Mencocokkan 'user_id' dengan parameter 'id' yang diberikan
      },
    },
    // Tahap 2: Melakukan operasi "lookup" untuk menggabungkan data dari koleksi 'products'
    {
      $lookup: {
        from: "products", // Nama koleksi yang akan digabungkan (produk)
        localField: "cart_items", // Field di koleksi 'orders' yang menjadi referensi produk (cart_items)
        foreignField: "code", // Field di koleksi 'products' yang akan dicocokkan dengan 'cart_items'
        as: "products", // Nama array hasil penggabungan yang akan ditambahkan ke dokumen hasil
      },
    },
  ])
    // Jika berhasil, mengirimkan hasil agregasi yang berisi informasi pesanan dan produk terkait
    .then((result) => {
      res.send(result); // Mengirim hasil ke klien
    })
    // Jika terjadi kesalahan selama agregasi, mengirimkan respons dengan status 500 dan pesan kesalahan
    .catch((err) => {
      res.status(500).send({
        message: err.message || "some error products", // Pesan default jika err.message tidak tersedia
      });
    });
};

// Fungsi untuk menambahkan produk ke dalam keranjang belanja pengguna
exports.addToCart = (req, res) => {
  // Mendapatkan ID pengguna dan kode produk dari parameter dan body request
  const id = Number(req.params.id);
  const productCode = String(req.body.product);

  // Menggunakan updateOne untuk menambahkan produk ke dalam array 'cart_items' milik pengguna
  Order.updateOne(
    {
      user_id: id, // Mencocokkan ID pengguna
    },
    {
      $addToSet: {
        cart_items: productCode, // Menambahkan produk ke dalam array 'cart_items' jika belum ada
      },
    }
  )
    // Jika berhasil, mengirimkan hasil update ke klien
    .then((result) => {
      res.send(result);
    })
    // Jika terjadi kesalahan saat menambahkan ke keranjang, mengirimkan respons dengan status 409
    .catch((err) => {
      res.status(409).send({
        message: err.message, // Pesan kesalahan jika terjadi
      });
    });
};

// Fungsi untuk menghapus produk dari keranjang belanja pengguna
exports.removeFromCart = (req, res) => {
  // Mendapatkan ID pengguna dan kode produk yang akan dihapus dari parameter request
  const id = Number(req.params.id);
  const productCode = String(req.params.product);
  console.log("Remove from cart:", { user_id: id, productCode }); // Debugging

  // Menggunakan updateOne dengan operasi $pull untuk menghapus produk dari 'cart_items'
  Order.updateOne({ user_id: id }, { $pull: { cart_items: productCode } })
    // Jika berhasil, mengirimkan hasil update ke klien
    .then((result) => {
      console.log("Update result:", result); // Debugging
      res.send(result);
    })
    // Jika terjadi kesalahan saat menghapus produk, mengirimkan respons dengan status 409
    .catch((err) => {
      console.error("Error removing product:", err); // Debugging
      res.status(409).send({
        message: err.message, // Pesan kesalahan jika terjadi
      });
    });
};
