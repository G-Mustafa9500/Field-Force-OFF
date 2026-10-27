const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key:   { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  label: { type: String }
});

module.exports = mongoose.model('Setting', settingSchema);
