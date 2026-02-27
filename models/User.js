const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    plan: {
      type: String,
      enum: ["free", "pro1999", "pro3999"],
      default: "free",
    },

    callsUsedToday: {
      type: Number,
      default: 0,
    },

    lastCallDate: {
      type: Date,
      default: null,
    },

    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);