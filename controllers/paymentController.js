const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ================= CREATE ORDER =================
exports.createOrder = async (req, res) => {
  try {
    const { plan } = req.body;

    const PLAN_PRICING = {
      pro1999: 1999,
      pro3999: 3999
    };

    if (!PLAN_PRICING[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid Plan"
      });
    }

    const options = {
      amount: PLAN_PRICING[plan] * 100, // paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order,
    });

  } catch (error) {
    console.log("Create Order Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Order creation failed"
    });
  }
};


// ================= VERIFY PAYMENT =================
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan
    } = req.body;

    // 🔐 Generate expected signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature ❌"
      });
    }

    // ================= PLAN CONFIG =================
    const PLAN_CONFIG = {
      pro1999: {
        dailyCalls: 250
      },
      pro3999: {
        dailyCalls: 500
      }
    };

    if (!PLAN_CONFIG[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid Plan"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // ================= UPDATE USER =================
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    user.plan = plan;
    user.subscriptionExpiresAt = expiryDate;
    user.callsUsedToday = 0;

    await user.save();

    res.json({
      success: true,
      message: "Payment verified & plan activated ✅"
    });

  } catch (error) {
    console.log("Verify Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });
  }
};