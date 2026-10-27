const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  employee:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  session:           { type: mongoose.Schema.Types.ObjectId, ref: 'DaySession' },
  type:              { type: String, enum: ['route_deviation'], required: true },
  severity:          { type: String, enum: ['warning', 'alert', 'critical'], default: 'alert' },
  location:          { lat: Number, lng: Number },
  distanceFromRoute: { type: Number },
  description:       { type: String },
  isRead:            { type: Boolean, default: false },
  date:              { type: String },
  timestamp:         { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
