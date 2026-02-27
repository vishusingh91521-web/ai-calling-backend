require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// ================== CORS CONFIG ==================
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
    "http://localhost:3000",
    "https://ai-calling-frontend.onrender.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ================== MIDDLEWARES ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ================== MONGODB CONNECTION ==================
mongoose.connect(process.env.MONGO_URI)
  .then((conn) => {
    console.log("✅ MongoDB Connected Successfully");
    console.log("📂 Connected Database:", conn.connection.name);
  })
  .catch((err) => {
    console.log("❌ MongoDB Error:", err.message);
  });

// ================== ROUTES ==================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/call", require("./routes/callRoutes"));
app.use("/api/plan", require("./routes/planRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/voice", require("./routes/voiceRoutes"));

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