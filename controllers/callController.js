const twilio = require("twilio");
const VoiceResponse = twilio.twiml.VoiceResponse;
const CallLog = require("../models/CallLog");
const User = require("../models/User");

// ======================================================
// 🔥 PLAN CONFIGURATION (FINAL)
// ======================================================
const PLANS = {
  free: {
    name: "Free",
    dailyLimit: 100,
    maxMinutesPerCall: 15,
  },
  pro1999: {
    name: "Pro ₹1999",
    dailyLimit: 250,
    maxMinutesPerCall: 30,
  },
  pro3999: {
    name: "Pro ₹3999",
    dailyLimit: 500,
    maxMinutesPerCall: 40,
  },
};

// ======================================================
// 📞 INCOMING CALL (TWILIO WEBHOOK)
// ======================================================
const incomingCall = async (req, res) => {
  try {
    const twiml = new VoiceResponse();

    twiml.say(
      { language: "hi-IN" },
      "नमस्ते Vishu। CallForge AI अब Live है। आपका AI Assistant Active है।"
    );

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (error) {
    console.log("Incoming Error:", error.message);
    res.status(500).send("Webhook Error");
  }
};

// ======================================================
// 📞 OUTBOUND CALL
// ======================================================
const makeOutboundCall = async (req, res) => {
  try {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Phone number (to) is required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ======================================================
    // 🔄 DAILY RESET
    // ======================================================
    const today = new Date().toDateString();
    const lastCallDate = user.lastCallDate
      ? new Date(user.lastCallDate).toDateString()
      : null;

    if (today !== lastCallDate) {
      user.callsUsedToday = 0;
      user.lastCallDate = new Date();
      await user.save();
    }

    // ======================================================
    // ⏳ AUTO PLAN EXPIRY CHECK
    // ======================================================
    if (
      user.plan !== "free" &&
      user.subscriptionExpiresAt &&
      new Date() > user.subscriptionExpiresAt
    ) {
      user.plan = "free";
      user.subscriptionExpiresAt = null;
      user.callsUsedToday = 0;
      await user.save();
    }

    const planData = PLANS[user.plan] || PLANS["free"];

    // ======================================================
    // 🚫 DAILY LIMIT CHECK
    // ======================================================
    if (user.callsUsedToday >= planData.dailyLimit) {
      return res.status(403).json({
        success: false,
        message: "Daily call limit reached 🚫",
        remainingCalls: 0,
      });
    }

    // ======================================================
    // 📞 TWILIO CLIENT
    // ======================================================
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const call = await client.calls.create({
      url: `${process.env.PUBLIC_URL}/api/calls/incoming`,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      timeLimit: planData.maxMinutesPerCall * 60,
      statusCallback: `${process.env.PUBLIC_URL}/api/calls/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["completed"],
    });

    // ======================================================
    // 📊 INCREMENT USAGE
    // ======================================================
    user.callsUsedToday += 1;
    user.lastCallDate = new Date();
    await user.save();

    // ======================================================
    // 📝 SAVE CALL LOG
    // ======================================================
    await CallLog.create({
      user: user._id,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
      status: "initiated",
      duration: 0,
      callSid: call.sid,
    });

    return res.json({
      success: true,
      message: "Call initiated successfully 🚀",
      callSid: call.sid,
      plan: user.plan,
      remainingCalls:
        planData.dailyLimit - user.callsUsedToday,
      maxMinutesPerCall: planData.maxMinutesPerCall,
    });

  } catch (error) {
    console.log("Outbound Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ======================================================
// 📊 CALL STATUS CALLBACK
// ======================================================
const callStatusCallback = async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    await CallLog.findOneAndUpdate(
      { callSid: CallSid },
      {
        status: CallStatus,
        duration: CallDuration ? Number(CallDuration) : 0,
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.log("Status Callback Error:", error.message);
    res.sendStatus(500);
  }
};

// ======================================================
// 📋 GET CALL LOGS
// ======================================================
const getCallLogs = async (req, res) => {
  try {
    const logs = await CallLog.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    console.log("Fetch Logs Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
    });
  }
};

// ======================================================
// 📦 EXPORTS
// ======================================================
module.exports = {
  incomingCall,
  makeOutboundCall,
  callStatusCallback,
  getCallLogs,
};