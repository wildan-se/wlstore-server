const { authJwt } = require("../middleware");
const adminController = require("../controllers/admin.controller");
const orderController = require("../controllers/order.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept, x-access-token"
    );
    next();
  });

  // Health check endpoint for system status
  app.get("/api/health", adminController.healthCheck);

  // Dashboard data (stats + activities + system status)
  app.get(
    "/api/admin/dashboard",
    [authJwt.verifyToken, authJwt.isAdmin],
    adminController.getDashboardData
  );

  // Dashboard statistics
  app.get(
    "/api/admin/stats",
    [authJwt.verifyToken, authJwt.isAdmin],
    adminController.getDashboardStats
  );

  // Recent activities
  app.get(
    "/api/admin/activities",
    [authJwt.verifyToken, authJwt.isAdmin],
    adminController.getRecentActivities
  );

  // Get all users for admin management
  app.get(
    "/api/admin/users",
    [authJwt.verifyToken, authJwt.isAdmin],
    adminController.getAllUsers
  );

  // Real-time order activities
  app.get(
    "/api/admin/order-activities",
    [authJwt.verifyToken, authJwt.isAdmin],
    adminController.getOrderActivities
  );

  // System status
  app.get(
    "/api/admin/system-status",
    [authJwt.verifyToken, authJwt.isAdmin],
    adminController.getSystemStatus
  );

  // Order management endpoints
  app.get(
    "/api/admin/orders",
    [authJwt.verifyToken, authJwt.isAdmin],
    orderController.getAllOrders
  );

  app.get(
    "/api/admin/orders/stats",
    [authJwt.verifyToken, authJwt.isAdmin],
    orderController.getOrderStats
  );

  app.put(
    "/api/admin/orders/:orderId/status",
    [authJwt.verifyToken, authJwt.isAdmin],
    orderController.updateOrderStatus
  );

  app.delete(
    "/api/admin/orders/:orderId",
    [authJwt.verifyToken, authJwt.isAdmin],
    orderController.deleteOrder
  );
};
