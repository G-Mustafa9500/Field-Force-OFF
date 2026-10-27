const express = require('express');
const router  = express.Router();
const Shop    = require('../models/Shop');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const shops = await Shop.find({ isActive: true }).sort({ area: 1, name: 1 });
    res.json(shops);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const shop = await new Shop(req.body).save();
    res.status(201).json(shop);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(shop);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Shop.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Shop delete ho gaya' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
