const express = require('express');
const router  = express.Router();
const Alert   = require('../models/Alert');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { date, isRead } = req.query;
    const filter = {};
    if (date)            filter.date   = date;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const alerts = await Alert.find(filter)
      .populate('employee', 'name employeeId')
      .sort({ timestamp: -1 })
      .limit(200);
    res.json(alerts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/count', protect, adminOnly, async (req, res) => {
  try {
    const count = await Alert.countDocuments({ isRead: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Mark all read — specific route pehle
router.put('/read-all', protect, adminOnly, async (req, res) => {
  try {
    await Alert.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'Sab alerts read ho gaye' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id/read', protect, adminOnly, async (req, res) => {
  try {
    await Alert.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Done' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
