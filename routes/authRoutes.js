const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  getDashboard,
  upgradePlan,
  downgradeToFree,
  verifyPayment,
  googleLogin
} = require("../controllers/authController");

// Public Routes
router.post("/google", googleLogin);
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected Routes
router.get("/dashboard", authMiddleware, getDashboard);
router.post("/upgrade", authMiddleware, upgradePlan);

// Downgrade Plan 
router.post("/downgrade", authMiddleware, downgradeToFree);

// Razorpay plan
router.post("/verify-payment", authMiddleware, verifyPayment);

// Google Login
router.post("/google-login", async (req, res) => {
  const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      user = await User.create({
        name,
        email,
        password: "google_user",
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
    console.log(error);
    res.status(500).json({ message: "Google Login Failed" });
  }
});

})

module.exports = router;