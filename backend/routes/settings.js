const express = require('express');
const router  = express.Router();
const Setting = require('../models/Setting');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const all = await Setting.find();
    const obj = {};
    all.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const { key, value } = req.body;
    await Setting.findOneAndUpdate({ key }, { key, value }, { upsert: true, new: true });
    res.json({ message: 'Setting save ho gaya' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
