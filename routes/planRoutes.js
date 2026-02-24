const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkSubscription = require("../middleware/checkSubscription");
const authController = require("../controllers/authController");

router.get(
  "/dashboard",
  authMiddleware,
  checkSubscription,  // 👈 ADD THIS
  authController.getDashboard
);

module.exports = router;