const mongoose = require('mongoose');

const daySessionSchema = new mongoose.Schema({
  employee:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  route:         { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  date:          { type: String, required: true },
  startTime:     { type: Date },
  endTime:       { type: Date },
  startLocation: { lat: Number, lng: Number },
  endLocation:   { lat: Number, lng: Number },
  totalKm:       { type: Number, default: 0 },
  fuelUsed:      { type: Number, default: 0 },   // liters
  fuelAmount:    { type: Number, default: 0 },   // Rs
  deviationCount: { type: Number, default: 0 },
  status:        { type: String, enum: ['active', 'completed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('DaySession', daySessionSchema);
