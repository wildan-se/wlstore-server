// app/controllers/order.controller.js
const db = require("../models");
const Order = db.orders;
const Product = db.products;
const User = db.users;

// Import mongoose untuk mengakses mongoose.Types.ObjectId
const mongoose = require("mongoose");

// Import admin controller untuk activity logging
const { addActivity } = require("./admin.controller");

// Enhanced input validation helper function
function validateObjectId(id, fieldName) {
  if (!id) {
    throw new Error(`${fieldName} is required`);
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName} format. Expected valid ObjectId`);
  }
  return new mongoose.Types.ObjectId(id);
}

// Enhanced error handling helper
function handleControllerError(error, res, operation = "operation") {
  console.error(`❌ Error in ${operation}:`, error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(error.errors).map((err) => err.message),
      operation,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      operation,
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || `Error during ${operation}`,
    operation,
    timestamp: new Date().toISOString(),
  });
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

    // Log activity for admin monitoring (non-blocking)
    setTimeout(() => {
      addActivity("cart", `Item "${product.name}" ditambahkan ke keranjang`, {
        productCode,
        productName: product.name,
        quantity: quantity,
        customerAction: "add_to_cart",
        timestamp: new Date(),
      });
    }, 0);
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

// === ADMIN FUNCTIONS FOR ORDER MANAGEMENT ===

// Admin: Get all orders with pagination and filtering
exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

    console.log(
      `📊 Admin accessing orders - Page: ${page}, Status: ${status || "all"}`
    );

    // Build filter
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    // Exclude cart status from admin view
    if (!filter.status) {
      filter.status = { $ne: "cart" };
    }

    // Get orders with user details
    const orders = await Order.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
          pipeline: [
            {
              $project: {
                username: 1,
                email: 1,
                name: 1,
                phone: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "cart_items.productCode",
          foreignField: "code",
          as: "productLookup",
          pipeline: [
            {
              $project: {
                code: 1,
                name: 1,
                price: 1,
                imageUrl: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          userDetails: { $arrayElemAt: ["$userDetails", 0] },
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
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        orders: orders,
        stats: {
          total: totalOrders,
          pending: await Order.countDocuments({ status: "pending" }),
          completed: await Order.countDocuments({ status: "completed" }),
          cancelled: await Order.countDocuments({ status: "cancelled" }),
        },
      },
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit),
      },
    });
  } catch (error) {
    console.error("Error getting all orders:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving orders",
      error: error.message,
    });
  }
};

// Enhanced order status update with comprehensive logging
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, adminNotes } = req.body;
    const adminId = req.userId;

    console.log(
      `🔄 Admin ${adminId} updating order ${orderId} to status: ${status}`
    );

    // Enhanced validation
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    // Validate status with detailed validation
    const validStatuses = [
      "cart",
      "pending",
      "processing",
      "shipped",
      "completed",
      "cancelled",
    ];
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
        validStatuses,
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${validStatuses.join(", ")}`,
        provided: status,
        validStatuses,
      });
    }

    // Find order with comprehensive population
    const order = await Order.findById(orderId).populate({
      path: "userId",
      select: "username email name phone isActive",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
        orderId,
      });
    }

    // Validate status transition
    const statusTransitions = {
      cart: ["pending"],
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["completed"],
      completed: [],
      cancelled: [],
    };

    const allowedTransitions = statusTransitions[order.status] || [];
    if (order.status !== status && !allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${order.status}" to "${status}"`,
        currentStatus: order.status,
        allowedTransitions,
      });
    }

    const oldStatus = order.status;
    const updateData = {
      status,
      updatedAt: new Date(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    // Update order
    Object.assign(order, updateData);
    const updatedOrder = await order.save();

    // Enhanced activity logging with more details
    const activityId = addActivity(
      "order",
      `Status pesanan #${orderId.slice(
        -6
      )} diubah dari "${oldStatus}" ke "${status}" oleh admin`,
      {
        orderId: order._id,
        oldStatus,
        newStatus: status,
        customerName: order.userId?.name || "Unknown",
        customerEmail: order.userId?.email || "",
        customerPhone: order.userId?.phone || "",
        totalAmount: order.total_price,
        itemCount: order.cart_items?.length || 0,
        adminId,
        notes: notes || "",
        adminNotes: adminNotes || "",
        timestamp: new Date(),
        actionType: "status_update",
        severity: status === "cancelled" ? "warning" : "info",
        source: "admin_panel",
      }
    );

    console.log(
      `✅ Order ${orderId} status updated: ${oldStatus} → ${status} (Activity: ${activityId})`
    );

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: {
        order: updatedOrder,
        statusChange: {
          from: oldStatus,
          to: status,
          timestamp: updateData.updatedAt,
        },
        activityId,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, "updateOrderStatus");
  }
};

// Admin: Delete order with enhanced validation and logging
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const adminId = req.userId;
    const { reason, forceDelete = false } = req.body;

    console.log(`🗑️ Admin ${adminId} attempting to delete order ${orderId}`);

    // Enhanced validation
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    // Find order with comprehensive details
    const order = await Order.findById(orderId).populate({
      path: "userId",
      select: "username email name phone isActive",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
        orderId,
      });
    }

    // Enhanced deletion rules
    const protectedStatuses = ["pending", "processing", "shipped"];
    const allowedStatuses = ["completed", "cancelled"];

    if (!forceDelete && protectedStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete order with status "${
          order.status
        }". Only orders with status: ${allowedStatuses.join(
          ", "
        )} can be deleted.`,
        currentStatus: order.status,
        allowedStatuses,
        protectedStatuses,
        suggestion:
          "Use forceDelete=true to override this restriction (not recommended)",
      });
    }

    // Backup order data before deletion
    const orderBackup = {
      orderId: order._id,
      customerInfo: {
        name: order.userId?.name || "Unknown",
        email: order.userId?.email || "",
        phone: order.userId?.phone || "",
      },
      orderDetails: {
        status: order.status,
        totalAmount: order.total_price,
        itemCount: order.cart_items?.length || 0,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      items: order.cart_items || [],
      notes: order.notes || "",
      deletionInfo: {
        adminId,
        reason: reason || "No reason provided",
        forced: forceDelete,
        timestamp: new Date(),
      },
    };

    // Perform deletion
    await Order.findByIdAndDelete(orderId);

    // Enhanced activity logging
    const activityId = addActivity(
      "order",
      `Pesanan #${orderId.slice(-6)} dari "${
        order.userId?.name || "Unknown"
      }" telah dihapus ${forceDelete ? "[PAKSA]" : ""} oleh admin`,
      {
        orderId: order._id,
        customerName: order.userId?.name || "Unknown",
        customerEmail: order.userId?.email || "",
        customerPhone: order.userId?.phone || "",
        status: order.status,
        totalAmount: order.total_price,
        itemCount: order.cart_items?.length || 0,
        adminId,
        reason: reason || "No reason provided",
        forced: forceDelete,
        orderBackup,
        timestamp: new Date(),
        actionType: "delete",
        severity: forceDelete ? "critical" : "warning",
        source: "admin_panel",
      }
    );

    console.log(
      `✅ Order ${orderId} deleted by admin ${adminId} (Activity: ${activityId})`
    );

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      data: {
        deletedOrderId: orderId,
        customerName: order.userId?.name || "Unknown",
        status: order.status,
        totalAmount: order.total_price,
        deletionInfo: {
          adminId,
          reason: reason || "No reason provided",
          forced: forceDelete,
          timestamp: new Date(),
        },
        activityId,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, "deleteOrder");
  }
};

// Admin: Get order statistics
exports.getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $match: {
          status: { $ne: "cart" },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total_price" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments({ status: { $ne: "cart" } });
    const totalRevenue = await Order.aggregate([
      {
        $match: {
          status: { $in: ["delivered", "completed"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total_price" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusBreakdown: stats,
        totalOrders,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      },
    });
  } catch (error) {
    console.error("Error getting order stats:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving order statistics",
      error: error.message,
    });
  }
};
