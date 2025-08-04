const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(
  process.env.DB_URI || "mongodb://localhost:27017/collect_wlstore"
);
const Product = require("./app/models/product.model")(mongoose);

async function updateProducts() {
  try {
    await Product.deleteMany({});
    console.log("Cleared existing products");

    const products = [
      {
        code: "PRD001",
        name: "iPhone 15 Pro Max",
        description:
          "Latest iPhone with advanced A17 Pro chip and titanium design",
        price: 18999000,
        imageUrl: "/img/iphone.jpg",
        stock: 25,
        averageRating: 4.8,
      },
      {
        code: "PRD002",
        name: "Kamera Canon EOS R6",
        description:
          "Professional mirrorless camera with 20.1MP full-frame sensor",
        price: 35999000,
        imageUrl: "/img/kamera.jpg",
        stock: 15,
        averageRating: 4.7,
      },
      {
        code: "PRD003",
        name: "TWS Earbuds Premium",
        description: "Wireless earbuds with active noise cancellation",
        price: 2499000,
        imageUrl: "/img/tws.jpg",
        stock: 50,
        averageRating: 4.5,
      },
      {
        code: "PRD004",
        name: "Kacamata Fashion",
        description: "Stylish sunglasses with UV protection",
        price: 599000,
        imageUrl: "/img/kacamata.jpg",
        stock: 35,
        averageRating: 4.2,
      },
      {
        code: "PRD005",
        name: "Sepatu Running Nike",
        description: "Comfortable running shoes with air cushioning",
        price: 1899000,
        imageUrl: "/img/sepatu-running.jpg",
        stock: 30,
        averageRating: 4.6,
      },
      {
        code: "PRD006",
        name: "Sepatu Heels Elegant",
        description: "Elegant high heels perfect for formal occasions",
        price: 1299000,
        imageUrl: "/img/sepatu-heels.jpg",
        stock: 20,
        averageRating: 4.3,
      },
      {
        code: "PRD007",
        name: "Sepatu Casual Kets",
        description: "Comfortable casual sneakers for everyday wear",
        price: 899000,
        imageUrl: "/img/sepatu-kets.jpg",
        stock: 40,
        averageRating: 4.4,
      },
      {
        code: "PRD008",
        name: "Dompet Kulit Premium",
        description:
          "Genuine leather wallet with multiple card slots and RFID protection",
        price: 599000,
        imageUrl: "/img/dompet.jpg",
        stock: 45,
        averageRating: 4.5,
      },
      {
        code: "PRD009",
        name: "Eco Panda Tumbler",
        description: "Eco-friendly stainless steel tumbler with panda design",
        price: 299000,
        imageUrl: "/img/ecopanda.jpg",
        stock: 60,
        averageRating: 4.1,
      },
      {
        code: "PRD010",
        name: "Febreze Air Freshener",
        description: "Long-lasting air freshener to eliminate odors naturally",
        price: 89000,
        imageUrl: "/img/febreze.jpg",
        stock: 80,
        averageRating: 4.0,
      },
      {
        code: "PRD011",
        name: "Las Egar Organic Drink",
        description: "Healthy organic drink made from natural ingredients",
        price: 45000,
        imageUrl: "/img/lasegar.jpg",
        stock: 100,
        averageRating: 4.2,
      },
      {
        code: "PRD012",
        name: "Lensbaby Photography Lens",
        description: "Creative photography lens for unique artistic effects",
        price: 4999000,
        imageUrl: "/img/lensbaby.jpg",
        stock: 10,
        averageRating: 4.8,
      },
    ];

    const created = await Product.insertMany(products);
    console.log("Created", created.length, "products with correct image paths");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

updateProducts();
