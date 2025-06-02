// models/Servicerequest.js (for servicerequests collection aka vehicle preparations)
const mongoose = require('mongoose');

const ServicerequestSchema = new mongoose.Schema({
  dateCreated: Date,
  vehicleRegNo: String,
  service: [{ serviceTime: String, status: String }],
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('Servicerequest', ServicerequestSchema, 'servicerequests');
