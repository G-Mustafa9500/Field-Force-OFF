const express = require("express");
const router  = express.Router();
const Route   = require("../models/Route");
const User    = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", protect, async (req, res) => {
  try {
    const { date } = req.query;
    const filter   = { isActive: true };
    if (date) filter.routeDate = date;

    const routes = await Route.find(filter)
      .populate("assignedTo", "name employeeId")
      .populate("shops.shop")
      .sort({ routeDate: -1, createdAt: -1 });
    res.json(routes);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Employee apna aaj ka route dekhe
router.get("/my", protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    let route = await Route.findOne({ assignedTo: req.user._id, isActive: true, routeDate: today })
      .populate("shops.shop");

    // Fallback: agar aaj ka route nahi to latest active route
    if (!route) {
      route = await Route.findOne({ assignedTo: req.user._id, isActive: true })
        .populate("shops.shop")
        .sort({ routeDate: -1, createdAt: -1 });
    }
    res.json(route || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const today    = new Date().toISOString().split("T")[0];
    const routeDate = req.body.routeDate || today;
    const route    = await new Route({ ...req.body, routeDate }).save();
    if (req.body.assignedTo)
      await User.findByIdAndUpdate(req.body.assignedTo, { assignedRoute: route._id });
    res.status(201).json(route);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const old = await Route.findById(req.params.id);
    if (old?.assignedTo && String(old.assignedTo) !== req.body.assignedTo) {
      await User.findByIdAndUpdate(old.assignedTo, { $unset: { assignedRoute: "" } });
    }
    if (req.body.assignedTo)
      await User.findByIdAndUpdate(req.body.assignedTo, { assignedRoute: req.params.id });

    const route = await Route.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("assignedTo", "name employeeId")
      .populate("shops.shop");
    res.json(route);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (route?.assignedTo)
      await User.findByIdAndUpdate(route.assignedTo, { $unset: { assignedRoute: "" } });
    await Route.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Route delete ho gaya" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
