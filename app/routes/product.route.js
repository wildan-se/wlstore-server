// app/routes/product.route.js
module.exports = (app) => {
  const products = require("../controllers/product.controller");
  const router = require("express").Router();
  const upload = app.get("upload");
  const { verifyToken, isAdmin } = require("../middleware/authJwt"); // Import middleware

  // Rute Publik (tidak perlu otentikasi)
  router.get("/", products.findAll);
  router.get("/:id", products.findOne);

  // Rute Admin (membutuhkan token dan peran admin)
  // Urutan middleware penting: verifyToken dulu, baru isAdmin
  router.post(
    "/",
    [verifyToken, isAdmin, upload.single("image")],
    products.create
  );
  router.put(
    "/:id",
    [verifyToken, isAdmin, upload.single("image")],
    products.update
  );
  router.delete("/:id", [verifyToken, isAdmin], products.delete); // Tidak ada file upload untuk delete

  app.use("/api/products", router);
};
