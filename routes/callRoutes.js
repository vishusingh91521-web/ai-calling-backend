const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
  incomingCall,
  makeOutboundCall,
  callStatusCallback,
  getCallLogs
} = require("../controllers/callController");

// Incoming (Twilio webhook)
router.post("/incoming", incomingCall);

// Outbound (Protected)
router.get("/outbound", protect, makeOutboundCall);

// Status callback
router.post("/status", callStatusCallback);

// Logs (Protected)
router.get("/logs", protect, getCallLogs);

module.exports = router;