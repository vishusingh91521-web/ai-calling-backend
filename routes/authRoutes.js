const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  getDashboard,
  upgradePlan,
  downgradeToFree,
  verifyPayment,
  googleLogin
} = require("../controllers/authController");

// Public Routes
router.post("/google", googleLogin);
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected Routes
router.get("/dashboard", authMiddleware, getDashboard);
router.post("/upgrade", authMiddleware, upgradePlan);

// Downgrade Plan 
router.post("/downgrade", authMiddleware, downgradeToFree);

// Razorpay plan
router.post("/verify-payment", authMiddleware, verifyPayment);

module.exports = router;