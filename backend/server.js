const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const path       = require("path");
const rateLimit  = require("express-rate-limit");
const jwt        = require("jsonwebtoken");
const User       = require("./models/User");
const { addClient, removeClient } = require("./utils/sseClients");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Rate Limiting ────────────────────────────────────────────
const trackingLimiter = rateLimit({ windowMs: 60*1000, max: 10, standardHeaders: true, legacyHeaders: false });
const authLimiter     = rateLimit({ windowMs: 60*1000, max: 20 });
app.use("/api/tracking/update", trackingLimiter);
app.use("/api/auth", authLimiter);

// ── SSE — Real-time alerts for admin ──────────────────────────
app.get("/api/sse", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user || user.role !== "admin") return res.status(403).end();
  } catch { return res.status(401).end(); }

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(": connected\n\n");

  addClient(res);
  const hb = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 25000);
  req.on("close", () => { clearInterval(hb); removeClient(res); });
});

// ── API Routes ───────────────────────────────────────────────
app.use("/api/auth",        require("./routes/auth"));
app.use("/api/employees",   require("./routes/employees"));
app.use("/api/shops",       require("./routes/shops"));
app.use("/api/routes",      require("./routes/routeManager"));
app.use("/api/attendance",  require("./routes/attendance"));
app.use("/api/tracking",    require("./routes/tracking"));
app.use("/api/checkin",     require("./routes/checkin"));
app.use("/api/alerts",      require("./routes/alerts"));
app.use("/api/settings",    require("./routes/settings"));
app.use("/api/reports",     require("./routes/reports"));
app.get("/api/health",      (req, res) => res.json({ status: "ok", time: new Date() }));

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled:", err.stack);
  res.status(500).json({ message: "Server error — dobara try karo" });
});
app.use((req, res) => res.status(404).json({ message: `${req.path} nahi mila` }));

process.on("unhandledRejection", (r) => console.error("Unhandled Rejection:", r));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => { console.error("❌ MongoDB:", err.message); process.exit(1); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));
