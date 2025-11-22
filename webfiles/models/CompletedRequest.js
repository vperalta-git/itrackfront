const mongoose = require('mongoose');

const CompletedRequestSchema = new mongoose.Schema({
  dateCreated: {
    type: Date,
    default: Date.now
  },
  vehicleRegNo: String,
  service: [String],
  serviceTime: String,
  status: String
}, { timestamps: true });

const CompletedRequestModel = mongoose.model('CompletedRequest', CompletedRequestSchema);
module.exports = CompletedRequestModel;
