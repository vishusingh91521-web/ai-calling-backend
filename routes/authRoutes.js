const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  googleLogin,
  getDashboard,
  verifyPayment,
  downgradeToFree
} = require("../controllers/authController");

// ================= PUBLIC ROUTES =================
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);

// ================= PROTECTED ROUTES =================
router.get("/dashboard", protect, getDashboard);
router.post("/verify-payment", protect, verifyPayment);
router.post("/downgrade", protect, downgradeToFree);

module.exports = router;