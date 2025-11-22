// models/InProgressRequest.js
const mongoose = require('mongoose');

const InProgressRequestSchema = new mongoose.Schema({
  dateCreated: String,
  vehicleRegNo: String,
  service: [String],
  serviceTime: String,
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('InProgressRequest', InProgressRequestSchema);
