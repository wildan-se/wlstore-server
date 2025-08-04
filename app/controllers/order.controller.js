// app/controllers/order.controller.js
const db = require("../models");
const Order = db.orders;
const Product = db.products;
const User = db.users;

// Import mongoose untuk mengakses mongoose.Types.ObjectId
const mongoose = require("mongoose");

// Input validation helper function
function validateObjectId(id, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
  return new mongoose.Types.ObjectId(id);
}
// 1. Mengambil Keranjang Belanja Pengguna (Optimized version)
exports.findUserCart = async (req, res) => {
  try {
    const userId = validateObjectId(req.userId, "userId");

    // Gunakan aggregation pipeline yang lebih efisien
    const cart = await Order.aggregate([
      { $match: { userId: userId, status: "cart" } },
      {
        $lookup: {
          from: "products",
          localField: "cart_items.productCode",
          foreignField: "code",
          as: "productLookup",
          pipeline: [
            {
              $project: {
                _id: 1,
                code: 1,
                name: 1,
                price: 1,
                imageUrl: 1,
                stock: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          cart_items: {
            $map: {
              input: "$cart_items",
              as: "item",
              in: {
                productCode: "$$item.productCode",
                quantity: "$$item.quantity",
                productDetails: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$productLookup",
                        cond: { $eq: ["$$this.code", "$$item.productCode"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      { $project: { productLookup: 0 } },
    ]);

    if (cart.length > 0) {
      res.status(200).send({
        message: "Cart retrieved successfully.",
        cart: cart[0],
      });
    } else {
      res.status(200).send({
        message: "Cart is empty.",
        cart: { cart_items: [], total_price: 0 },
      });
    }
  } catch (error) {
    console.error("Error finding user cart:", error);
    res.status(500).send({
      message: error.message || "Error retrieving cart.",
    });
  }
};

// Fungsi pembantu untuk menghitung ulang total harga - Optimized version
async function calculateTotalPrice(cartItems) {
  if (!cartItems || cartItems.length === 0) return 0;

  // Menggunakan Promise.all untuk query parallel dan Map untuk caching
  const productCodes = [...new Set(cartItems.map((item) => item.productCode))];
  const products = await Product.find({ code: { $in: productCodes } }).lean();

  // Create a map for O(1) lookups
  const productMap = new Map(
    products.map((product) => [product.code, product.price])
  );

  let totalPrice = 0;
  for (const item of cartItems) {
    const price = productMap.get(item.productCode);
    if (price) {
      totalPrice += price * item.quantity;
    }
  }
  return totalPrice;
}

// 2. Menambah atau Memperbarui Item di Keranjang
exports.addToCart = async (req, res) => {
  try {
    console.log("Add to cart - userId from middleware:", req.userId);
    const userObjectId = validateObjectId(req.userId, "userId");
    console.log("Add to cart - validated ObjectId:", userObjectId);

    const { productCode, quantity = 1 } = req.body;

    // Input validation
    if (!productCode?.trim()) {
      return res.status(400).send({ message: "Product code is required." });
    }
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return res
        .status(400)
        .send({ message: "Quantity must be a positive integer." });
    }

    // Verify product exists and has stock
    const product = await Product.findOne({ code: productCode }).lean();
    if (!product) {
      return res.status(404).send({
        message: `Product with code ${productCode} not found.`,
      });
    }
    if (product.stock < quantity) {
      return res.status(400).send({
        message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
      });
    }

    // Find or create cart
    let cart = await Order.findOne({ userId: userObjectId, status: "cart" });

    if (!cart) {
      // Create new cart
      cart = new Order({
        userId: userObjectId,
        cart_items: [{ productCode: productCode, quantity: quantity }],
        status: "cart",
      });
    } else {
      // Update existing cart
      const itemIndex = cart.cart_items.findIndex(
        (item) => item.productCode === productCode
      );

      if (itemIndex > -1) {
        // Product already in cart, update quantity
        const newQuantity = cart.cart_items[itemIndex].quantity + quantity;
        if (product.stock < newQuantity) {
          return res.status(400).send({
            message: `Adding ${quantity} units would exceed stock for ${
              product.name
            }. Max available: ${
              product.stock - cart.cart_items[itemIndex].quantity
            }`,
          });
        }
        cart.cart_items[itemIndex].quantity = newQuantity;
      } else {
        // Add new product to cart
        cart.cart_items.push({ productCode: productCode, quantity: quantity });
      }
    }

    // Calculate total price and save
    cart.total_price = await calculateTotalPrice(cart.cart_items);
    await cart.save();

    // Populate product details for response
    const populatedCart = await Order.aggregate([
      { $match: { _id: cart._id } },
      {
        $lookup: {
          from: "products",
          localField: "cart_items.productCode",
          foreignField: "code",
          as: "productLookup",
          pipeline: [
            {
              $project: {
                _id: 1,
                code: 1,
                name: 1,
                price: 1,
                imageUrl: 1,
                stock: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          cart_items: {
            $map: {
              input: "$cart_items",
              as: "item",
              in: {
                productCode: "$$item.productCode",
                quantity: "$$item.quantity",
                productDetails: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$productLookup",
                        cond: { $eq: ["$$this.code", "$$item.productCode"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      { $project: { productLookup: 0 } },
    ]);

    res.status(200).send({
      message: "Product added to cart successfully!",
      cart: populatedCart[0] || cart.toJSON(),
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).send({
      message: error.message || "Error adding product to cart.",
    });
  }
};

// 3. Memperbarui Kuantitas Item di Keranjang
exports.updateCartItemQuantity = async (req, res) => {
  try {
    const userObjectId = validateObjectId(req.userId, "userId");
    const { productCode, newQuantity } = req.body;

    if (!productCode?.trim() || newQuantity === undefined || newQuantity < 0) {
      return res.status(400).send({
        message: "Product code and a valid new quantity (>=0) are required.",
      });
    }

    const cart = await Order.findOne({ userId: userObjectId, status: "cart" });
    if (!cart) {
      return res.status(404).send({ message: "Cart not found." });
    }

    const itemIndex = cart.cart_items.findIndex(
      (item) => item.productCode === productCode
    );

    if (itemIndex === -1) {
      return res.status(404).send({ message: "Product not found in cart." });
    }

    if (newQuantity === 0) {
      cart.cart_items.splice(itemIndex, 1);
    } else {
      const product = await Product.findOne({ code: productCode }).lean();
      if (!product) {
        return res.status(404).send({
          message: `Product with code ${productCode} not found in database.`,
        });
      }

      if (product.stock < newQuantity) {
        return res.status(400).send({
          message: `Not enough stock for ${product.name}. Available: ${product.stock}`,
        });
      }
      cart.cart_items[itemIndex].quantity = newQuantity;
    }

    cart.total_price = await calculateTotalPrice(cart.cart_items);
    await cart.save();

    // Populate product details for response
    const productCodes = cart.cart_items.map((item) => item.productCode);
    const products = await Product.find({ code: { $in: productCodes } }).lean();
    const productMap = new Map(products.map((p) => [p.code, p]));

    const populatedCartItems = cart.cart_items.map((item) => ({
      productCode: item.productCode,
      quantity: item.quantity,
      productDetails: productMap.get(item.productCode) || null,
    }));

    const responseCart = {
      ...cart.toJSON(),
      cart_items: populatedCartItems,
    };

    res.status(200).send({
      message: "Cart item quantity updated successfully!",
      cart: responseCart,
    });
  } catch (error) {
    console.error("Error updating cart item quantity:", error);
    res.status(500).send({
      message: error.message || "Error updating cart item quantity.",
    });
  }
};

// 4. Menghapus Item dari Keranjang
exports.removeFromCart = async (req, res) => {
  try {
    const userObjectId = validateObjectId(req.userId, "userId");
    const { productCode } = req.body;

    if (!productCode?.trim()) {
      return res.status(400).send({ message: "Product code is required." });
    }

    const cart = await Order.findOne({ userId: userObjectId, status: "cart" });
    if (!cart) {
      return res.status(404).send({ message: "Cart not found." });
    }

    const initialLength = cart.cart_items.length;
    cart.cart_items = cart.cart_items.filter(
      (item) => item.productCode !== productCode
    );

    if (cart.cart_items.length === initialLength) {
      return res.status(404).send({
        message: "Product not found in cart to remove.",
      });
    }

    cart.total_price = await calculateTotalPrice(cart.cart_items);
    await cart.save();

    // Populate product details for response if cart still has items
    let responseCart = cart.toJSON();
    if (cart.cart_items.length > 0) {
      const productCodes = cart.cart_items.map((item) => item.productCode);
      const products = await Product.find({
        code: { $in: productCodes },
      }).lean();
      const productMap = new Map(products.map((p) => [p.code, p]));

      const populatedCartItems = cart.cart_items.map((item) => ({
        productCode: item.productCode,
        quantity: item.quantity,
        productDetails: productMap.get(item.productCode) || null,
      }));

      responseCart.cart_items = populatedCartItems;
    }

    res.status(200).send({
      message: "Product removed from cart successfully!",
      cart: responseCart,
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).send({
      message: error.message || "Error removing product from cart.",
    });
  }
};

// Fungsi untuk mengosongkan keranjang (akan digunakan di checkout nanti)
exports.clearCart = async (userId) => {
  try {
    const userObjectId = validateObjectId(userId, "userId");
    const result = await Order.deleteOne({
      userId: userObjectId,
      status: "cart",
    });
    return result.deletedCount > 0;
  } catch (error) {
    console.error("Error clearing cart:", error);
    throw new Error("Failed to clear cart.");
  }
};
