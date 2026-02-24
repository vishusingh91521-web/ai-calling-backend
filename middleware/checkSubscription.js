const User = require("../models/User");

const checkSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user is on paid plan
    if (user.plan !== "free") {

      // If expired OR expiry missing
      if (!user.subscriptionExpiresAt || new Date() > user.subscriptionExpiresAt) {

        user.plan = "free";
        user.subscriptionExpiresAt = null;
        user.callsUsedToday = 0;

        await user.save();

        console.log("User auto downgraded to free plan");
      }
    }

    next();

  } catch (error) {
    console.log("Subscription Check Error:", error.message);
    return res.status(500).json({ message: "Subscription validation failed" });
  }
};

module.exports = checkSubscription;