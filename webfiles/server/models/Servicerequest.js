const mongoose = require('mongoose');
const ServicerequestSchema = new mongoose.Schema({
  dateCreated: {
    type: Date,
    default: Date.now
  },
  vehicleRegNo: String,
  unitName: String, // <-- Added unitName field
  service: [String],
  serviceTime: String,
  status: String,
  inProgressAt: Date,
  completedAt: Date,
  serviceDurationMinutes: Number,
  preparedBy: String // Added field for tracking who prepared the request
}, { timestamps: true });

const ServicerequestModel = mongoose.model("servicerequest", ServicerequestSchema);
module.exports = ServicerequestModel;
