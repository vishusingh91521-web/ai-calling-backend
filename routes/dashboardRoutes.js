const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.json({
      email: user.email,
      plan: user.plan || "Free",
      dailyCallLimit: user.dailyCallLimit || 0,
      subscriptionExpiresAt: user.subscriptionExpiresAt || null
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;