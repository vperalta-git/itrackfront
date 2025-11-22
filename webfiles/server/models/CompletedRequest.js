const mongoose = require('mongoose');

const CompletedRequestSchema = new mongoose.Schema({
  dateCreated: String,
  vehicleRegNo: String,
  unitName: String, // <-- Added unitName field
  service: [String],
  serviceTime: String,
  status: String,
  inProgressAt: Date,
  completedAt: Date,
  serviceDurationMinutes: Number,
  preparedBy: String // New field for tracking who prepared the request
}, { timestamps: true });

module.exports = mongoose.model('CompletedRequest', CompletedRequestSchema);
