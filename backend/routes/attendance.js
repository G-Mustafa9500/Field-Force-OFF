const express    = require("express");
const router     = express.Router();
const Attendance = require("../models/Attendance");
const { protect, adminOnly } = require("../middleware/auth");
const { uploadBase64 } = require("../utils/cloudinary");

router.post("/mark", protect, async (req, res) => {
  try {
    const { type, photo, location } = req.body;
    if (!photo)    return res.status(400).json({ message: "Photo zaroori hai" });
    if (!location?.lat) return res.status(400).json({ message: "Location zaroori hai" });

    const today = new Date().toISOString().split("T")[0];

    // Cloudinary pe upload
    let photoUrl = "";
    try {
      photoUrl = await uploadBase64(photo, "attendance");
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return res.status(500).json({ message: "Photo upload fail hui. Try karo." });
    }

    let att = await Attendance.findOne({ employee: req.user._id, date: today });

    if (type === "checkin") {
      if (att?.checkInTime) return res.status(400).json({ message: "Aaj check-in ho chuka hai" });
      if (!att) att = new Attendance({ employee: req.user._id, date: today });
      att.checkInTime     = new Date();
      att.checkInPhoto    = photoUrl;
      att.checkInLocation = location;
      att.status          = "present";
    } else {
      if (!att?.checkInTime)  return res.status(400).json({ message: "Pehle check-in karo" });
      if (att.checkOutTime)   return res.status(400).json({ message: "Check-out ho chuka hai" });
      att.checkOutTime     = new Date();
      att.checkOutPhoto    = photoUrl;
      att.checkOutLocation = location;
    }

    await att.save();
    res.json({
      message: type === "checkin" ? "✅ Check-in ho gaya!" : "✅ Check-out ho gaya!",
      attendance: att
    });
  } catch (err) {
    console.error("Attendance error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/today", protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const att   = await Attendance.findOne({ employee: req.user._id, date: today });
    res.json(att || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { date, employeeId } = req.query;
    const filter = {};
    if (date)       filter.date     = date;
    if (employeeId) filter.employee = employeeId;
    const list = await Attendance.find(filter)
      .populate("employee", "name employeeId role")
      .sort({ createdAt: -1 }).limit(300);
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
