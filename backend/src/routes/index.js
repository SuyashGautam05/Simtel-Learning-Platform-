const express = require("express");
const authRoutes = require("./auth.routes");
const moduleRoutes = require("./modules.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/modules", moduleRoutes);
router.use("/admin", adminRoutes);

// Future routes plug in here without touching anything above:
// router.use("/colleges", collegeRoutes);
// router.use("/quizzes", quizRoutes);
// router.use("/progress", progressRoutes);

module.exports = router;
