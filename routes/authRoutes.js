const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  getDashboard,
  // upgradePlan,
  downgradeToFree,
  verifyPayment
} = require("../controllers/authController");

// ================= PUBLIC ROUTES =================
router.post("/register", registerUser);
router.post("/login", loginUser);

// ================= GOOGLE LOGIN =================
router.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });

    if (!user) {
  const hashedPassword = await bcrypt.hash("google_login_user", 10);

  user = await User.create({
    name,
    email,
    password: hashedPassword,
    plan: "free",
    callsUsedToday: 0,
    lastCallDate: new Date(),
    subscriptionExpiresAt: null
  });
}

    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Google Login Successful",
      token: jwtToken,
    });

  } catch (error) {
    console.log("Google Login Error:", error);
    res.status(500).json({ message: "Google Login Failed" });
  }
});

// ================= PROTECTED ROUTES =================
router.get("/dashboard", authMiddleware, getDashboard);
router.post("/upgrade", authMiddleware, upgradePlan);
router.post("/downgrade", authMiddleware, downgradeToFree);
router.post("/verify-payment", authMiddleware, verifyPayment);

module.exports = router;