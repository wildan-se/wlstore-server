module.exports = (mongoose) => {
  // Membuat dan mengekspor model Mongoose untuk koleksi "orders"

  // Definisi skema untuk dokumen di dalam koleksi "orders"
  const schema = mongoose.Schema({
    // Properti 'user_id' untuk menyimpan ID pengguna (tipe: Number)
    user_id: Number,

    // Properti 'cart_items' untuk menyimpan daftar item di keranjang belanja (tipe: array dari string)
    cart_items: [String],
  });

  // Menambahkan metode kustom "toJSON" ke skema
  // Tujuannya adalah untuk mengontrol bagaimana data dikonversi menjadi JSON,
  // khususnya saat mengembalikan data dari API.
  schema.method("toJSON", function () {
    // Mendapatkan properti dokumen yang telah dikonversi ke objek biasa
    const { __v, _id, ...object } = this.toObject();

    // Menghapus properti bawaan MongoDB yang tidak diperlukan (__v dan _id)
    // __v digunakan oleh Mongoose untuk menyimpan versi dokumen
    // _id adalah properti default MongoDB untuk menyimpan ID dokumen

    // Menambahkan properti baru 'id' dengan nilai dari '_id'
    object.id = _id;

    // Mengembalikan objek yang telah dimodifikasi
    return object;
  });

  // Membuat model Mongoose untuk koleksi "orders" berdasarkan skema
  const Order = mongoose.model("orders", schema);

  // Mengembalikan model agar dapat digunakan di file lain
  return Order;
};
