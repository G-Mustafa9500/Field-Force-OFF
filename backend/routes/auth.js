const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true }).populate('assignedRoute');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Email ya password galat hai' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        _id: user._id, name: user.name, email: user.email,
        role: user.role, employeeId: user.employeeId,
        bikeAverage: user.bikeAverage, assignedRoute: user.assignedRoute
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// First-time admin setup
router.post('/setup', async (req, res) => {
  try {
    const exists = await User.findOne({ role: 'admin' });
    if (exists) return res.status(400).json({ message: 'Admin pehle se exist karta hai' });
    const admin = new User({ ...req.body, role: 'admin' });
    await admin.save();
    res.json({ message: 'Admin account ban gaya! Ab login karo.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if setup needed
router.get('/needs-setup', async (req, res) => {
  const exists = await User.findOne({ role: 'admin' });
  res.json({ needsSetup: !exists });
});

module.exports = router;
