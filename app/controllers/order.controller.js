// Mengimpor model dari folder '../models'
const db = require("../models");
const Order = db.orders;

// Fungsi untuk menangani permintaan menemukan pesanan berdasarkan ID pengguna
exports.findOrder = (req, res) => {
  // Mendapatkan parameter ID pengguna dari URL dan mengonversinya ke tipe Number
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).send({ message: "Invalid user ID" });
  }

  // Menggunakan MongoDB Aggregation Framework untuk memproses data
  Order.aggregate([
    // Tahap 1: Filter dokumen untuk hanya mencocokkan dokumen dengan user_id yang sesuai
    {
      $match: {
        user_id: id, // Mencocokkan 'user_id' dengan parameter 'id'
      },
    },
    // Tahap 2: Melakukan operasi "lookup" untuk menggabungkan data dari koleksi 'products'
    {
      $lookup: {
        from: "products", // Nama koleksi yang akan digabungkan
        localField: "cart_items", // Field di koleksi 'orders' yang menjadi referensi
        foreignField: "code", // Field di koleksi 'products' yang akan dicocokkan
        as: "products", // Nama array hasil penggabungan di dokumen hasil
      },
    },
  ])
    // Jika berhasil, mengirim hasil agregasi ke klien
    .then((result) => {
      res.send(result);
    })
    // Jika terjadi kesalahan, mengirimkan respons dengan status 500 dan pesan kesalahan
    .catch((err) => {
      res.status(500).send({
        message: err.message || "some error products", // Pesan default jika err.message tidak tersedia
      });
    });
};

exports.addToCart = (req, res) => {
  const id = Number(req.params.id);
  const productCode = String(req.body.product);

  Order.updateOne(
    {
      user_id: id,
    },
    {
      $addToSet: {
        cart_items: productCode,
      },
    }
  )
    .then((result) => {
      res.send(result);
    })
    .catch((err) => {
      res.status(409).send({
        message: err.message,
      });
    });
};

exports.removeFromCart = (req, res) => {
  const id = Number(req.params.id);
  const productCode = String(req.params.product);
  console.log("Remove from cart:", { user_id: id, productCode }); // Debugging

  Order.updateOne({ user_id: id }, { $pull: { cart_items: productCode } })
    .then((result) => {
      console.log("Update result:", result); // Debugging
      res.send(result);
    })
    .catch((err) => {
      console.error("Error removing product:", err); // Debugging
      res.status(409).send({
        message: err.message,
      });
    });
};
