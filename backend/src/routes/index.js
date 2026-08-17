const express = require("express");
const authRoutes = require("./auth.routes");
const moduleRoutes = require("./modules.routes");
const adminRoutes = require("./admin.routes");
const collegeRoutes = require("./college.routes");
const userRoutes = require("./user.routes");
const auditRoutes = require("./audit.routes");
const productRoutes = require("./product.routes");
const productKeyRoutes = require("./productKey.routes");
const myProductsRoutes = require("./myProducts.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/modules", moduleRoutes);
router.use("/admin", adminRoutes);
router.use("/colleges", collegeRoutes);
router.use("/users", userRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/products", productRoutes);
router.use("/product-keys", productKeyRoutes);
router.use("/my-products", myProductsRoutes);

// Future routes plug in here without touching anything above:
// router.use("/quizzes", quizRoutes);
// router.use("/progress", progressRoutes);

module.exports = router;