const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, required: true },
  phone:         { type: String },
  role:          { type: String, enum: ['admin', 'order_booker', 'delivery_boy'], default: 'order_booker' },
  employeeId:    { type: String, unique: true, sparse: true },
  bikeAverage:   { type: Number, default: 40 }, // km per liter
  assignedRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  isActive:      { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
