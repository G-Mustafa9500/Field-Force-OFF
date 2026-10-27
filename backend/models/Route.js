const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  routeDate:  { type: String, default: () => new Date().toISOString().split("T")[0] }, // YYYY-MM-DD
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  startPoint: {
    name: { type: String, default: "Warehouse" },
    lat:  { type: Number, required: true },
    lng:  { type: Number, required: true }
  },
  shops: [{
    shop:  { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    order: { type: Number }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Route", routeSchema);
