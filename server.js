require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();

/* ================== ENV VALIDATION ================== */
const requiredEnv = [
  "PORT",
  "MONGO_URI",
  "JWT_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  // "GOOGLE_TTS_API_KEY",
  "PUBLIC_URL",
];

requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.error(`❌ Missing required ENV variable: ${env}`);
    process.exit(1);
  }
});

/* ================== SECURITY ================== */
app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5501",
      "http://127.0.0.1:5501",
      "http://localhost:3000",
      "https://ai-calling-frontend.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

/* ================== MIDDLEWARES ================== */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

/* ================== MONGODB CONNECTION ================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then((conn) => {
    console.log("✅ MongoDB Connected Successfully");
    console.log("📂 Connected Database:", conn.connection.name);
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

/* ================== ROUTES ================== */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/call", require("./routes/callRoutes"));
app.use("/api/plan", require("./routes/planRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/voice", require("./routes/voiceRoutes"));

/* ================== TEST ROUTES ================== */
app.get("/", (req, res) => {
  res.send("🚀 CallForge AI Calling SaaS Backend Running");
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date(),
    environment: process.env.NODE_ENV || "development",
  });
});

/* ================== 404 HANDLER ================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ================== GLOBAL ERROR HANDLER ================== */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

/* ================== SERVER ================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});