const twilio = require("twilio");
const VoiceResponse = twilio.twiml.VoiceResponse;
const CallLog = require("../models/CallLog");

// ===============================
// 📊 PLAN CONFIGURATION
// ===============================
const PLANS = {
  free: {
    dailyLimit: 100,
    maxMinutesPerCall: 15,
  },
  pro1999: {
    dailyLimit: 250,
    maxMinutesPerCall: 30,
  },
  pro3999: {
    dailyLimit: 500,
    maxMinutesPerCall: 40,
  },
};

// ===============================
// 📞 INCOMING CALL (Twilio Webhook)
// ===============================
const incomingCall = async (req, res) => {
  try {
    const twiml = new VoiceResponse();

    twiml.say(
      { language: "hi-IN", voice: "alice" },
      "Namaste Vishu. CallForge AI ab live hai. Aapka AI assistant active ho chuka hai."
    );

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (error) {
    console.log("Incoming Error:", error.message);
    res.status(500).send("Error");
  }
};

// ===============================
// 📞 OUTBOUND CALL
// ===============================
const makeOutboundCall = async (req, res) => {
  try {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: "Phone number (to) is required",
      });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ===============================
    // 📅 DAILY RESET
    // ===============================
    const today = new Date().toDateString();

    if (!user.lastCallDate) {
      user.lastCallDate = new Date();
      user.callsUsedToday = 0;
    } else {
      const lastDate = new Date(user.lastCallDate).toDateString();
      if (lastDate !== today) {
        user.callsUsedToday = 0;
        user.lastCallDate = new Date();
      }
    }

    // ===============================
    // ⏳ SUBSCRIPTION EXPIRY CHECK
    // ===============================
    if (
      user.plan !== "free" &&
      user.subscriptionExpiresAt &&
      new Date() > user.subscriptionExpiresAt
    ) {
      user.plan = "free";
      user.subscriptionExpiresAt = null;
      user.callsUsedToday = 0;
    }

    // ================= SAFE PLAN HANDLING =================
    const safePlan = ["free", "pro1999", "pro3999"].includes(user.plan)
      ? user.plan
      : "free";

    const planData = PLANS[safePlan];

    if (!planData) {
      return res.status(500).json({
        success: false,
        error: "Plan configuration error",
      });
    }

console.log("Full PLANS:", PLANS);
console.log("User Plan:", user.plan);
console.log("Safe Plan:", safePlan);
console.log("Plan Data Found:", planData);

if (!planData || !planData.maxMinutesPerCall) {
  console.log("Plan missing maxMinutesPerCall");
  return res.status(500).json({
    success: false,
    error: "Plan configuration broken",
  });
}

const minutes = parseInt(planData.maxMinutesPerCall);

console.log("Minutes Parsed:", minutes);

if (isNaN(minutes) || minutes <= 0) {
  console.log("Minutes invalid");
  return res.status(500).json({
    success: false,
    error: "Invalid TimeLimit value",
  });
}

const timeLimitSeconds = minutes * 60;

    // ===============================
    // 🚫 DAILY LIMIT CHECK
    // ===============================
    if (user.callsUsedToday >= planData.dailyLimit) {
      return res.status(403).json({
        success: false,
        message: "Daily call limit reached",
        remainingCalls: 0,
      });
    }

    // ===============================
    // ☎ TWILIO CLIENT
    // ===============================
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const call = await client.calls.create({
      url: `${process.env.PUBLIC_URL}/api/call/incoming`,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER,
      timeLimit: timeLimitSeconds,
      statusCallback: `${process.env.PUBLIC_URL}/api/call/status`,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["completed"],
    });

    // ===============================
    // 📊 UPDATE USAGE
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
      callSid: call.sid,
    });

    return res.json({
      success: true,
      callSid: call.sid,
      remainingCalls: planData.dailyLimit - user.callsUsedToday,
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

// ===============================
// 📊 STATUS CALLBACK
// ===============================
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

// ===============================
// 📋 GET CALL LOGS
// ===============================
const getCallLogs = async (req, res) => {
  try {
    const logs = await CallLog.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

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
  getCallLogs,
};