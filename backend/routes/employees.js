const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Route    = require('../models/Route');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const emps = await User.find({ role: { $ne: 'admin' }, isActive: true })
      .select('-password')
      .populate('assignedRoute', 'name');
    res.json(emps);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const count = await User.countDocuments();
    const employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
    const user = new User({ ...req.body, employeeId });
    await user.save();

    // BUG FIX: Route ka assignedTo bhi sync karo
    if (req.body.assignedRoute) {
      await Route.findByIdAndUpdate(req.body.assignedRoute, { assignedTo: user._id });
    }

    const out = user.toObject(); delete out.password;
    res.status(201).json(out);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Yeh email pehle se register hai' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const update = { ...rest };
    if (password) update.password = await bcrypt.hash(password, 10);

    // BUG FIX: Agar route change hua to purana route ka assignedTo clear karo
    const oldUser = await User.findById(req.params.id);
    if (oldUser?.assignedRoute && String(oldUser.assignedRoute) !== req.body.assignedRoute) {
      await Route.findByIdAndUpdate(oldUser.assignedRoute, { $unset: { assignedTo: '' } });
    }
    if (req.body.assignedRoute) {
      await Route.findByIdAndUpdate(req.body.assignedRoute, { assignedTo: req.params.id });
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select('-password').populate('assignedRoute', 'name');
    if (!user) return res.status(404).json({ message: 'Employee nahi mila' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee nahi mila' });
    // Route unassign karo
    if (user.assignedRoute) {
      await Route.findByIdAndUpdate(user.assignedRoute, { $unset: { assignedTo: '' } });
    }
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Employee deactivate ho gaya' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
