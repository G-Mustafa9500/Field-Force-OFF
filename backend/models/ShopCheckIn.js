const mongoose = require("mongoose");

const shopCheckInSchema = new mongoose.Schema({
  employee:         { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  shop:             { type: mongoose.Schema.Types.ObjectId, ref: "Shop",    required: true },
  route:            { type: mongoose.Schema.Types.ObjectId, ref: "Route" },
  session:          { type: mongoose.Schema.Types.ObjectId, ref: "DaySession" },
  date:             { type: String },
  photo:            { type: String },
  location:         { lat: Number, lng: Number },
  locationVerified: { type: Boolean, default: false },
  checkInStatus:    { type: String, enum: ["verified", "warning"], default: "verified" },
  distanceFromShop: { type: Number },
  notes:            { type: String },
  timestamp:        { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("ShopCheckIn", shopCheckInSchema);
