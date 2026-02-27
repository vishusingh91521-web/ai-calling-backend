const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  plan: {
    type: String,
    enum: ["free", "pro1999", "pro3999"],
    default: "free"
  },

  dailyCallLimit: {
    type: Number,
    default: 100
  },

  callsUsedToday: {
    type: Number,
    default: 0
  },

  lastCallDate: {
    type: Date,
    default: null
  },

  subscriptionExpiresAt: {
    type: Date,
    default: null
  }

}, { timestamps: true });


// 🔐 HASH PASSWORD BEFORE SAVE
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


// 🔑 MATCH PASSWORD METHOD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


module.exports = mongoose.model("User", userSchema);