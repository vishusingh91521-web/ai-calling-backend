const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const paymentController = require("../controllers/paymentController");

// ✅ Create Order
router.post("/create-order", protect, paymentController.createOrder);

// ✅ Verify Payment
router.post("/verify-payment", protect, paymentController.verifyPayment);

module.exports = router;