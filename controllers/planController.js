const User = require("../models/User");

exports.upgradePlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const { plan } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let dailyLimit = 100;

    if (plan === "pro1999") {
      dailyLimit = 250;
    }

    if (plan === "pro3999") {
      dailyLimit = 500;
    }

    if (!["pro1999", "pro3999"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    // 🔥 1 Month Expiry Set
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    user.plan = plan;
    user.dailyCallLimit = dailyLimit;
    user.subscriptionExpiresAt = expiryDate;
    user.callsUsedToday = 0;

    await user.save();

    res.json({
      message: "Plan upgraded successfully 🚀",
      newPlan: plan,
      dailyLimit,
      expiresAt: expiryDate
    });

  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
};