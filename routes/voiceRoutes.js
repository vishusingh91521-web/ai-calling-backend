const express = require("express");
const router = express.Router();

const {
  incomingCall,
  makeOutboundCall,
  callStatusCallback,
  getCallLogs
} = require("../controllers/voiceController");

const authMiddleware = require("../middleware/authMiddleware");
const checkSubscription = require("../middleware/checkSubscription");

// ===============================
// 📞 Outbound Call (Protected)
// ===============================
router.get(
  "/make",
  authMiddleware,
  checkSubscription,
  makeOutboundCall
);

// ===============================
// 📥 Incoming Call Webhook
// ===============================
router.post("/incoming", incomingCall);

// ===============================
// 📊 Call Status Callback
// ===============================
router.post("/status", callStatusCallback);

// ===============================
// 📋 Get Call Logs (Protected)
// ===============================
router.get(
  "/logs",
  authMiddleware,
  checkSubscription,
  getCallLogs
);

module.exports = router;