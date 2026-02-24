const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
    {
        user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

  to: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  callSid: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("CallLog", callLogSchema);