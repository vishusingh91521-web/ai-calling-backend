const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  incomingCall,
  makeOutboundCall,
  callStatusCallback,
  getCallLogs
} = require("../controllers/callController");

// 📞 Incoming call (Twilio webhook)
router.post("/incoming", incomingCall);

// 📤 Outbound call trigger
router.get("/outbound", protect,makeOutboundCall);

// 📊 Status callback (Call logs save karega)
router.post("/status", callStatusCallback);

// 📜 Get all call logs
router.get("/logs", protect,getCallLogs);

module.exports = router;