// Mengeksport fungsi yang menerima mongoose sebagai parameter dan mengembalikan model Product
module.exports = (mongoose) => {
  // Mendefinisikan skema untuk koleksi 'products' menggunakan mongoose.Schema
  const schema = mongoose.Schema({
    code: String, // Kode unik produk
    name: String, // Nama produk
    price: Number, // Harga produk
    description: String, // Deskripsi produk
    imageUrl: String, // URL gambar produk
    averageRating: Number, // Rating rata-rata produk
  });

  // Menambahkan metode 'toJSON' untuk mengubah cara objek dikembalikan dalam format JSON
  schema.method("toJSON", function () {
    // Menghapus properti __v dan _id, dan menggantikan _id dengan id dalam objek hasil
    const { __v, _id, ...object } = this.toObject();
    object.id = _id; // Menambahkan properti 'id' untuk menggantikan '_id'
    return object; // Mengembalikan objek yang telah dimodifikasi
  });

  // Membuat model 'Product' berdasarkan skema yang telah didefinisikan
  const Product = mongoose.model("products", schema);

  // Mengembalikan model 'Product' untuk digunakan di file lain
  return Product;
};
