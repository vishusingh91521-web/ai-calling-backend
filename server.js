require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// ================== MIDDLEWARES ==================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(express.static(path.join(__dirname)));

// ================== MONGODB CONNECTION ==================
mongoose
  .connect(process.env.MONGO_URI)
  .then((conn) => {
    console.log("✅ MongoDB Connected Successfully");
    console.log("📂 Connected Database:", conn.connection.name);

  })
  .catch((err) => {
    console.log("❌ MongoDB Error:", err.message);
  });

// ================== ROUTES ==================
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const callRoutes = require("./routes/callRoutes");
const planRoutes = require("./routes/planRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const voiceRoutes = require("./routes/voiceRoutes"); // ElevenLabs

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/call", callRoutes);
app.use("/api/plan", planRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/voice", voiceRoutes); // Voice API

// ================== TEST ROUTE ==================
app.get("/", (req, res) => {
  res.send("AI Calling SaaS Backend Running 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend Working Fine"
  });
});

// ================== SERVER ==================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});