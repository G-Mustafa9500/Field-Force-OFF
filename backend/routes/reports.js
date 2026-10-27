const express      = require('express');
const router       = express.Router();
const DaySession   = require('../models/DaySession');
const Attendance   = require('../models/Attendance');
const ShopCheckIn  = require('../models/ShopCheckIn');
const Alert        = require('../models/Alert');
const { protect, adminOnly } = require('../middleware/auth');

// Aaj ka summary — dashboard ke liye
router.get('/summary', protect, adminOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [todayAttendance, unreadAlerts, activeSessions, todayCheckIns] = await Promise.all([
      Attendance.countDocuments({ date: today }),
      Alert.countDocuments({ isRead: false }),
      DaySession.countDocuments({ date: today, status: 'active' }),
      ShopCheckIn.countDocuments({ date: today })
    ]);
    res.json({ todayAttendance, unreadAlerts, activeSessions, todayCheckIns });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Fuel report — employee wise
router.get('/fuel', protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const filter = { status: 'completed' };
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
    else if (startDate) filter.date = startDate;
    if (employeeId) filter.employee = employeeId;

    const sessions = await DaySession.find(filter)
      .populate('employee', 'name employeeId bikeAverage role')
      .sort({ date: -1 });

    // Employee wise group karo
    const map = {};
    sessions.forEach(s => {
      const id = s.employee._id.toString();
      if (!map[id]) map[id] = { employee: s.employee, totalKm: 0, fuelUsed: 0, fuelAmount: 0, days: 0, deviations: 0 };
      map[id].totalKm    += s.totalKm    || 0;
      map[id].fuelUsed   += s.fuelUsed   || 0;
      map[id].fuelAmount += s.fuelAmount || 0;
      map[id].days       += 1;
      map[id].deviations += s.deviationCount || 0;
    });

    res.json(Object.values(map));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Check-in report — admin ke liye
router.get('/checkins', protect, adminOnly, async (req, res) => {
  try {
    const { date, employeeId } = req.query;
    const filter = {};
    if (date)       filter.date     = date;
    if (employeeId) filter.employee = employeeId;

    const list = await ShopCheckIn.find(filter)
      .populate('employee', 'name employeeId')
      .populate('shop', 'name area address')
      .sort({ timestamp: -1 })
      .limit(500);
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
