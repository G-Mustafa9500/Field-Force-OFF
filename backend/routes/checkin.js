const express     = require("express");
const router      = express.Router();
const ShopCheckIn = require("../models/ShopCheckIn");
const Shop        = require("../models/Shop");
const Route       = require("../models/Route");
const { protect, adminOnly } = require("../middleware/auth");
const { getDistance } = require("../utils/geoUtils");
const { uploadBase64 } = require("../utils/cloudinary");

router.post("/", protect, async (req, res) => {
  try {
    const { shopId, sessionId, routeId, photo, location, notes } = req.body;
    if (!photo)    return res.status(400).json({ message: "Live photo zaroori hai" });
    if (!location) return res.status(400).json({ message: "Location zaroori hai" });

    const shop = await Shop.findById(shopId);
    if (!shop)  return res.status(404).json({ message: "Shop nahi mili" });

    const dist = getDistance(location.lat, location.lng, shop.location.lat, shop.location.lng);

    // Two-tier status
    let checkInStatus, locationVerified;
    if (dist <= 300) {
      checkInStatus    = "verified";
      locationVerified = true;
    } else if (dist <= 500) {
      checkInStatus    = "warning";
      locationVerified = false;
    } else {
      return res.status(400).json({
        message: `❌ Aap shop se ${Math.round(dist)}m door hain. 500m ke andar aao.`,
        distanceFromShop: Math.round(dist)
      });
    }

    // Shop order check
    if (routeId) {
      const route = await Route.findById(routeId);
      if (route?.shops?.length > 0) {
        const shopEntry = route.shops.find(s => String(s.shop) === String(shopId));
        const shopOrder = shopEntry?.order || 0;
        const today     = new Date().toISOString().split("T")[0];
        const doneCheckins = await ShopCheckIn.find({ session: sessionId, date: today });
        const doneOrders   = doneCheckins.map(c => {
          const entry = route.shops.find(s => String(s.shop) === String(c.shop));
          return entry?.order || 0;
        });
        const maxDone = doneOrders.length > 0 ? Math.max(...doneOrders) : 0;
        if (shopOrder > maxDone + 1) {
          return res.status(400).json({ message: `⚠️ Pehle shop #${maxDone + 1} visit karo` });
        }
      }
    }

    const today    = new Date().toISOString().split("T")[0];
    const existing = await ShopCheckIn.findOne({ employee: req.user._id, shop: shopId, date: today });
    if (existing) return res.status(400).json({ message: "Is shop pe aaj already check-in ho chuka hai" });

    // Cloudinary pe upload
    let photoUrl = "";
    try {
      photoUrl = await uploadBase64(photo, "checkins");
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      return res.status(500).json({ message: "Photo upload fail hui. Try karo." });
    }

    const checkIn = await new ShopCheckIn({
      employee: req.user._id, shop: shopId,
      session: sessionId, route: routeId,
      date: today, photo: photoUrl, location,
      locationVerified, checkInStatus,
      distanceFromShop: Math.round(dist), notes
    }).save();

    const msgs = {
      verified: "✅ Check-in Verified!",
      warning:  `⚠️ Warning: Aap ${Math.round(dist)}m door hain — record ho gaya`
    };
    res.json({ checkIn, locationVerified, checkInStatus, distanceFromShop: Math.round(dist), message: msgs[checkInStatus] });
  } catch (err) {
    console.error("Checkin error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/today", protect, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const list  = await ShopCheckIn.find({ employee: req.user._id, date: today })
      .populate("shop", "name address area");
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { date, employeeId, shopId } = req.query;
    const filter = {};
    if (date)       filter.date     = date;
    if (employeeId) filter.employee = employeeId;
    if (shopId)     filter.shop     = shopId;
    const list = await ShopCheckIn.find(filter)
      .populate("employee", "name employeeId")
      .populate("shop", "name address area")
      .sort({ createdAt: -1 }).limit(300);
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
