const mongoose = require('mongoose');

const InProgressRequestSchema = new mongoose.Schema({
  dateCreated: {
    type: Date,
    default: Date.now
  },
  vehicleRegNo: String,
  service: [String],
  serviceTime: String,
  status: String
}, { timestamps: true });

const InProgressRequestModel = mongoose.model('InProgressRequest', InProgressRequestSchema);
module.exports = InProgressRequestModel;
