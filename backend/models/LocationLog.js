const mongoose = require('mongoose');

const locationLogSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  session:  { type: mongoose.Schema.Types.ObjectId, ref: 'DaySession', required: true },
  date:     { type: String },
  locations: [{
    lat:               Number,
    lng:               Number,
    timestamp:         { type: Date, default: Date.now },
    isDeviation:       { type: Boolean, default: false },
    distanceFromRoute: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('LocationLog', locationLogSchema);
