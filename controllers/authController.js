const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= PLAN CONFIG =================
const PLAN_CONFIG = {
  free: { dailyCalls: 100, maxMinutesPerCall: 15 },
  pro1999: { dailyCalls: 250, maxMinutesPerCall: 30 },
  pro3999: { dailyCalls: 500, maxMinutesPerCall: 40 }
};

// ================= TOKEN GENERATOR =================
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ================= DAILY RESET HELPER =================
const handleDailyReset = async (user) => {
  const today = new Date().toDateString();

  if (!user.lastCallDate || user.lastCallDate.toDateString() !== today) {
    user.callsUsedToday = 0;
    user.lastCallDate = new Date();
    await user.save();
  }
};

// ================= REGISTER =================
const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      plan: "free",
      callsUsedToday: 0,
      lastCallDate: new Date(),
      subscriptionExpiresAt: null
    });

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(user._id),
      plan: user.plan
    });

  } catch (error) {
    console.log("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGIN =================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
      plan: user.plan
    });

  } catch (error) {
    console.log("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GOOGLE LOGIN =================
const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    let user = await User.findOne({ email });

    if (!user) {
      const hashedPassword = await bcrypt.hash("google-login", 10);

      user = await User.create({
        email,
        password: hashedPassword,
        plan: "free",
        callsUsedToday: 0,
        lastCallDate: new Date(),
        subscriptionExpiresAt: null
      });
    }

    res.json({
      message: "Google login successful",
      token: generateToken(user._id),
      plan: user.plan
    });

  } catch (error) {
    console.log("GOOGLE LOGIN ERROR:", error);
    res.status(500).json({ message: "Google login failed" });
  }
};

// ================= DASHBOARD =================
const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await handleDailyReset(user);

    // Auto expiry
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

    const planData = PLAN_CONFIG[user.plan];

    res.json({
      email: user.email,
      plan: user.plan,
      dailyCallLimit: planData.dailyCalls,
      callsUsedToday: user.callsUsedToday,
      callsRemaining: planData.dailyCalls - user.callsUsedToday,
      maxMinutesPerCall: planData.maxMinutesPerCall,
      subscriptionExpiresAt: user.subscriptionExpiresAt
    });

  } catch (error) {
    console.log("DASHBOARD ERROR:", error);
    res.status(500).json({ message: "Dashboard fetch failed" });
  }
};

// ================= VERIFY PAYMENT =================
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, plan } = req.body;

    if (!razorpay_payment_id) {
      return res.status(400).json({ message: "Payment failed" });
    }

    if (!PLAN_CONFIG[plan]) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const user = await User.findById(req.user._id);

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    user.plan = plan;
    user.callsUsedToday = 0;
    user.subscriptionExpiresAt = expiryDate;

    await user.save();

    res.json({
      message: "Payment successful 🚀 Plan upgraded!",
      plan: user.plan,
      subscriptionExpiresAt: expiryDate
    });

  } catch (error) {
    console.log("PAYMENT ERROR:", error);
    res.status(500).json({ message: "Verification failed" });
  }
};

// ================= DOWNGRADE =================
const downgradeToFree = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      plan: "free",
      subscriptionExpiresAt: null,
      callsUsedToday: 0
    });

    res.json({
      message: "Downgraded to Free successfully",
      plan: "free"
    });

  } catch (error) {
    console.log("DOWNGRADE ERROR:", error);
    res.status(500).json({ message: "Downgrade failed" });
  }
};

// ================= EXPORT =================
module.exports = {
  registerUser,
  loginUser,
  googleLogin,
  getDashboard,
  verifyPayment,
  downgradeToFree
};