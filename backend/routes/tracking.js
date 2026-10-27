const express      = require("express");
const router       = express.Router();
const DaySession   = require("../models/DaySession");
const LocationLog  = require("../models/LocationLog");
const Alert        = require("../models/Alert");
const Route        = require("../models/Route");
const Setting      = require("../models/Setting");
const User         = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");
const { getDistance, getMinDistFromRoute, getDeviationLevel, getAreaName } = require("../utils/geoUtils");
const { pushToAdmins } = require("../utils/sseClients");

// Din shuru karo
router.post("/start", protect, async (req, res) => {
  try {
    const today    = new Date().toISOString().split("T")[0];
    const existing = await DaySession.findOne({ employee: req.user._id, date: today, status: "active" });
    if (existing) return res.json(existing);

    const session = await new DaySession({
      employee:      req.user._id,
      route:         req.user.assignedRoute?._id || req.user.assignedRoute,
      date:          today,
      startTime:     new Date(),
      startLocation: req.body.location,
      status:        "active"
    }).save();

    await new LocationLog({ employee: req.user._id, session: session._id, date: today, locations: [] }).save();
    res.json(session);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GPS location update — har 30 sec
router.post("/update", protect, async (req, res) => {
  try {
    const { lat, lng, sessionId } = req.body;
    if (!lat || !lng || !sessionId) return res.status(400).json({ message: "lat, lng, sessionId zaroori" });

    const session = await DaySession.findById(sessionId)
      .populate({ path: "route", populate: { path: "shops.shop" } });
    if (!session || session.status !== "active") return res.status(400).json({ message: "Active session nahi" });

    // Route ke points
    let routePoints = [];
    if (session.route) {
      routePoints.push({ lat: session.route.startPoint.lat, lng: session.route.startPoint.lng });
      session.route.shops.forEach(s => {
        if (s.shop?.location) routePoints.push({ lat: s.shop.location.lat, lng: s.shop.location.lng });
      });
    }

    const distMeters = routePoints.length > 0 ? getMinDistFromRoute(lat, lng, routePoints) : 0;
    const level      = getDeviationLevel(distMeters);
    const isDev      = level !== "ok";

    // LocationLog update
    await LocationLog.findOneAndUpdate(
      { session: sessionId },
      { $push: { locations: { lat, lng, timestamp: new Date(), isDeviation: isDev, distanceFromRoute: Math.round(distMeters) } } }
    );

    // Alert banao — warning ya alert dono ke liye (5 min dedup)
    if (isDev) {
      const today  = new Date().toISOString().split("T")[0];
      const recent = await Alert.findOne({
        employee:  req.user._id,
        session:   sessionId,
        type:      "route_deviation",
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      if (!recent) {
        const severity = level === "alert"
          ? (distMeters > 1000 ? "critical" : "alert")
          : "warning";

        // Reverse geocode — area naam
        const area        = await getAreaName(lat, lng);
        const areaText    = area ? ` (${area} mein)` : "";
        const description = `${req.user.name} route se ${Math.round(distMeters)}m door gaya${areaText}`;

        const newAlert = await Alert.create({
          employee:          req.user._id,
          session:           sessionId,
          type:              "route_deviation",
          severity,
          location:          { lat, lng },
          distanceFromRoute: Math.round(distMeters),
          description,
          date:              today
        });

        await DaySession.findByIdAndUpdate(sessionId, { $inc: { deviationCount: 1 } });

        // SSE — real-time push to admin
        const populated = await Alert.findById(newAlert._id).populate("employee", "name employeeId");
        pushToAdmins(populated.toObject());
      }
    }

    res.json({ level, distanceFromRoute: Math.round(distMeters) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Din khatam — FIX: server-side KM calculation
router.post("/end", protect, async (req, res) => {
  try {
    const { sessionId, location } = req.body;
    // NOTE: req.body.totalKm is IGNORED — server calculates from LocationLog

    const session = await DaySession.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session nahi mila" });

    // FIX: Server-side KM from GPS log — client value ignore
    const log     = await LocationLog.findOne({ session: sessionId });
    const locs    = log?.locations || [];
    let   serverKm = 0;
    for (let i = 1; i < locs.length; i++) {
      const dist = getDistance(locs[i-1].lat, locs[i-1].lng, locs[i].lat, locs[i].lng);
      const km   = dist / 1000;
      if (km > 0.01 && km < 2) serverKm += km; // spike filter
    }
    const km = Math.round(serverKm * 100) / 100;

    const petrolSetting = await Setting.findOne({ key: "petrol_price" });
    const petrolPrice   = petrolSetting?.value || 280;
    const employee      = await User.findById(session.employee);
    const bikeAvg       = employee?.bikeAverage || 40;

    // FIX: Calculate fuelAmt from raw value — no double rounding
    const fuelUsedRaw = km / bikeAvg;
    const fuelAmt     = Math.round(fuelUsedRaw * petrolPrice);
    const fuelUsed    = Math.round(fuelUsedRaw * 100) / 100;

    const updated = await DaySession.findByIdAndUpdate(sessionId, {
      endTime:     new Date(),
      endLocation: location,
      totalKm:     km,
      fuelUsed,
      fuelAmount:  fuelAmt,
      status:      "completed"
    }, { new: true });

    res.json(updated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Active session (employee)
router.get("/active", protect, async (req, res) => {
  try {
    const today   = new Date().toISOString().split("T")[0];
    const session = await DaySession.findOne({ employee: req.user._id, date: today, status: "active" });
    res.json(session || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Live tracking — admin panel
router.get("/live", protect, adminOnly, async (req, res) => {
  try {
    const today    = new Date().toISOString().split("T")[0];
    const sessions = await DaySession.find({ date: today, status: "active" })
      .populate("employee", "name employeeId bikeAverage role phone")
      .populate("route", "name shops");

    const ShopCheckIn = require("../models/ShopCheckIn");
    const results     = await Promise.all(sessions.map(async s => {
      const log      = await LocationLog.findOne({ session: s._id });
      const locs     = log?.locations || [];
      const latest   = locs.length > 0 ? locs[locs.length - 1] : null;
      const shopsDone = await ShopCheckIn.countDocuments({ session: s._id, date: today });
      const totalShops = s.route?.shops?.length || 0;
      return {
        sessionId:     s._id,
        employee:      s.employee,
        route:         s.route ? { name: s.route.name } : null,
        totalKm:       s.totalKm || 0,
        deviations:    s.deviationCount || 0,
        startTime:     s.startTime,
        latestLoc:     latest ? { lat: latest.lat, lng: latest.lng, time: latest.timestamp } : null,
        shopsDone,
        totalShops,
        lastUpdateAgo: latest ? Math.round((Date.now() - new Date(latest.timestamp)) / 60000) : null
      };
    }));
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Sessions list (admin)
router.get("/sessions", protect, adminOnly, async (req, res) => {
  try {
    const { date, employeeId } = req.query;
    const filter = {};
    if (date)       filter.date     = date;
    if (employeeId) filter.employee = employeeId;
    const sessions = await DaySession.find(filter)
      .populate("employee", "name employeeId bikeAverage")
      .populate("route", "name")
      .sort({ createdAt: -1 }).limit(200);
    res.json(sessions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Location logs for a session
router.get("/logs/:sessionId", protect, adminOnly, async (req, res) => {
  try {
    const log = await LocationLog.findOne({ session: req.params.sessionId });
    res.json(log || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
