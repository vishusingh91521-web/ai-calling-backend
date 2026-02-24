const twilio = require("twilio");
const VoiceResponse = twilio.twiml.VoiceResponse;
const CallLog = require("../models/CallLog");
const User = require("../models/User");

// ===============================
// 📊 PLAN CONFIGURATION
// ===============================
const PLAN_CONFIG = {
  free: { dailyCalls: 100, maxMinutesPerCall: 15 },
  pro1999: { dailyCalls: 250, maxMinutesPerCall: 30 },
  pro3999: { dailyCalls: 500, maxMinutesPerCall: 40 }
};

// ===============================
// 📞 Incoming Call (Webhook)
// ===============================
const incomingCall = async (req, res) => {
  try {
    const twiml = new VoiceResponse();

    twiml.say(
      { language: "hi-IN" },
      "नमस्ते Vishu। CallForge AI अब Live है। आपका AI Assistant अब Active हो चुका है।"
    );

    res.type("text/xml");
    res.send(twiml.toString());

  } catch (error) {
    console.log("Incoming Error:", error.message);
    res.status(500).send("Error");
  }
};

// ===============================
// 📞 Outbound Call Trigger
// ===============================
const makeOutboundCall = async (req, res) => {
  try {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ===============================
    // 🔄 DAILY RESET LOGIC
    // ===============================
    const today = new Date().toDateString();

    if (!user.lastCallDate || user.lastCallDate.toDateString() !== today) {
      user.callsUsedToday = 0;
      user.lastCallDate = new Date();
      await user.save();
    }

    // ===============================
    // ⏳ AUTO EXPIRY CHECK
    // ===============================
    if (
  user.plan !== "free" &&
  user.subscriptionExpiresAt &&
  new Date() > user.subscriptionExpiresAt
) {
  user.plan = "free";
  user.subscriptionExpiresAt = null;
  user.callsUsedToday = 0;
  user.dailyCallLimit = PLAN_CONFIG["free"].dailyCalls; // reset limit

  await user.save();
}

    const planData = PLAN_CONFIG[user.plan] || PLAN_CONFIG["free"];

    // ===============================
    // 🚫 DAILY CALL LIMIT CHECK
    // ===============================
    if (user.callsUsedToday >= planData.dailyCalls) {
      return res.status(403).json({
        success: false,
        message: "Daily call limit reached.",
        remainingCalls: 0
      });
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // ===============================
    // 📞 CREATE CALL (With Time Limit)
    // ===============================
    const call = await client.calls.create({
      url: `${process.env.PUBLIC_URL}/api/call/incoming`,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      timeLimit: planData.maxMinutesPerCall * 60,
      statusCallback: `${process.env.PUBLIC_URL}/api/call/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["completed"]
    });

    // ===============================
    // 📊 INCREMENT USAGE
    // ===============================
    user.callsUsedToday += 1;
    await user.save();

    // ===============================
    // 📝 SAVE CALL LOG
    // ===============================
    await CallLog.create({
      user: user._id,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
      status: "initiated",
      duration: 0,
      callSid: call.sid
    });

    res.json({
      success: true,
      callSid: call.sid,
      remainingCalls: planData.dailyCalls - user.callsUsedToday,
      maxMinutesPerCall: planData.maxMinutesPerCall
    });

  } catch (error) {
    console.log("Outbound Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ===============================
// 📊 Call Status Callback
// ===============================
const callStatusCallback = async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    await CallLog.findOneAndUpdate(
      { callSid: CallSid },
      {
        status: CallStatus,
        duration: CallDuration ? Number(CallDuration) : 0
      }
    );

    res.sendStatus(200);

  } catch (error) {
    console.log("Status Callback Error:", error.message);
    res.sendStatus(500);
  }
};

// ===============================
// 📋 Get Call Logs
// ===============================
const getCallLogs = async (req, res) => {
  try {
    const logs = await CallLog.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json(logs);

  } catch (error) {
    console.log("Fetch Logs Error:", error.message);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};

module.exports = {
  incomingCall,
  makeOutboundCall,
  callStatusCallback,
  getCallLogs
};