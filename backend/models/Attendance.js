const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:     { type: String, required: true }, // YYYY-MM-DD
  checkInTime:     { type: Date },
  checkInPhoto:    { type: String },
  checkInLocation: { lat: Number, lng: Number },
  checkOutTime:     { type: Date },
  checkOutPhoto:    { type: String },
  checkOutLocation: { lat: Number, lng: Number },
  status: { type: String, enum: ['present', 'absent'], default: 'present' }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
