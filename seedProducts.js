// seedProducts.js
const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB connection
const MONGODB_URI =
  process.env.DB_URI || "mongodb://localhost:27017/collect_wlstore";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Product Schema
const productSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  imageUrl: { type: String },
  averageRating: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
});

const Product = mongoose.model("Product", productSchema);

// Products data sesuai dengan nama gambar yang ada
const productsData = [
  {
    code: "PROD001",
    name: "iPhone 14 Pro",
    price: 18000000,
    description: "iPhone terbaru dengan kamera pro dan performa tinggi.",
    imageUrl: "/img/iphone.jpg",
    averageRating: 4.8,
    stock: 25,
  },
  {
    code: "PROD002",
    name: "Sepatu Running Nike",
    price: 850000,
    description: "Sepatu running yang nyaman untuk olahraga sehari-hari.",
    imageUrl: "/img/sepatu-running.jpg",
    averageRating: 4.6,
    stock: 50,
  },
  {
    code: "PROD003",
    name: "Sepatu Heels Elegant",
    price: 650000,
    description: "Sepatu heels untuk acara formal dan kasual.",
    imageUrl: "/img/sepatu-heels.jpg",
    averageRating: 4.3,
    stock: 30,
  },
  {
    code: "PROD004",
    name: "Sepatu Sneakers Casual",
    price: 450000,
    description: "Sepatu sneakers untuk gaya kasual sehari-hari.",
    imageUrl: "/img/sepatu-kets.jpg",
    averageRating: 4.5,
    stock: 40,
  },
  {
    code: "PROD005",
    name: "TWS Earbuds Premium",
    price: 750000,
    description: "Earbuds wireless dengan kualitas suara premium.",
    imageUrl: "/img/tws.jpg",
    averageRating: 4.7,
    stock: 35,
  },
  {
    code: "PROD006",
    name: "Kamera Digital DSLR",
    price: 12500000,
    description: "Kamera DSLR profesional untuk fotografi.",
    imageUrl: "/img/kamera.jpg",
    averageRating: 4.9,
    stock: 15,
  },
  {
    code: "PROD007",
    name: "Kacamata Fashion",
    price: 350000,
    description: "Kacamata trendy untuk melindungi mata dari sinar UV.",
    imageUrl: "/img/kacamata.jpg",
    averageRating: 4.2,
    stock: 60,
  },
  {
    code: "PROD008",
    name: "Dompet Kulit Premium",
    price: 275000,
    description: "Dompet kulit asli dengan desain elegan.",
    imageUrl: "/img/dompet.jpg",
    averageRating: 4.4,
    stock: 45,
  },
  {
    code: "PROD009",
    name: "Eco Panda Tumbler",
    price: 125000,
    description: "Tumbler ramah lingkungan dengan desain panda lucu.",
    imageUrl: "/img/ecopanda.jpg",
    averageRating: 4.1,
    stock: 80,
  },
  {
    code: "PROD010",
    name: "Febreze Pengharum Ruangan",
    price: 45000,
    description: "Pengharum ruangan dengan aroma segar tahan lama.",
    imageUrl: "/img/febreze.jpg",
    averageRating: 4.0,
    stock: 100,
  },
  {
    code: "PROD011",
    name: "Las Egar Energy Drink",
    price: 15000,
    description: "Minuman energi untuk menambah stamina.",
    imageUrl: "/img/lasegar.jpg",
    averageRating: 3.8,
    stock: 150,
  },
  {
    code: "PROD012",
    name: "Lensbaby Creative Lens",
    price: 3500000,
    description: "Lensa kreatif untuk fotografi artistik.",
    imageUrl: "/img/lensbaby.jpg",
    averageRating: 4.6,
    stock: 10,
  },
];

async function seedProducts() {
  try {
    console.log("🌱 Starting product seeding...");

    // Clear existing products
    await Product.deleteMany({});
    console.log("📭 Cleared existing products");

    // Insert new products
    for (const productData of productsData) {
      try {
        const product = new Product(productData);
        await product.save();
        console.log(`✅ Added product: ${productData.name}`);
      } catch (error) {
        console.error(
          `❌ Error adding product ${productData.name}:`,
          error.message
        );
      }
    }

    console.log("🎉 Product seeding completed!");
    console.log(`📊 Total products added: ${productsData.length}`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seeder
seedProducts();
