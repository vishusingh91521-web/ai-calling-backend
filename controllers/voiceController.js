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
    const { userId } = req.query;

    const user = await User.findById(userId);
    const planData = PLAN_CONFIG[user.plan];

    const twiml = new VoiceResponse();

    twiml.say(
      { language: "hi-IN" },
      "नमस्ते Vishu। CallForge AI ab शुरू हो चुकी है। papa ji vishu ko call krlo" 
    );

    twiml.pause({
      length: parseInt(planData.maxMinutesPerCall, 10) * 60
    });

    twiml.say("आपका समय समाप्त हो गया है। धन्यवाद।");
    twiml.hangup();

    res.type("text/xml");
    res.send(twiml.toString());

  } catch (error) {
    console.log(error);
    res.status(500).send("Error");
  }
};

// ===============================
// 📞 Outbound Call
// ===============================
const makeOutboundCall = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({ message: "Phone number required" });
    }

    // 🔄 Subscription expiry check
    if (user.plan !== "free") {
      if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt < new Date()) {
        user.plan = "free";
        user.callsUsedToday = 0;
        await user.save();
      }
    }

    const planData = PLAN_CONFIG[user.plan];

    // 🚫 Daily limit check
    if (user.callsUsedToday >= planData.dailyCalls) {
      return res.status(403).json({
        success: false,
        message: "Daily call limit reached."
      });
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const call = await client.calls.create({
      url: `${process.env.PUBLIC_URL}/api/voice/incoming?userId=${user.id}`,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.PUBLIC_URL}/api/voice/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["completed"]
    });

    // 📊 Increase usage
    user.callsUsedToday += 1;
    await user.save();

    // 📝 Save log
    await CallLog.create({
      user: user._id,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
      status: "initiated",
      duration: 0,
      callSid: call.sid
    });

    res.json({ success: true, callSid: call.sid });

  } catch (error) {
    console.log("Outbound Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ===============================
// 📊 Status Callback
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
    res.sendStatus(500);
  }
};

// ===============================
// 📋 Get Logs
// ===============================
const getCallLogs = async (req, res) => {
  const logs = await CallLog.find({ user: req.user._id })
    .sort({ createdAt: -1 });

  res.json(logs);
};

module.exports = {
  incomingCall,
  makeOutboundCall,
  callStatusCallback,
  getCallLogs
};