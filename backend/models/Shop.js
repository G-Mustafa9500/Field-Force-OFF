const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  ownerName: { type: String },
  phone:     { type: String },
  address:   { type: String },
  area:      { type: String },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
