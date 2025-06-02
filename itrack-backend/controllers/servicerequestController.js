const ServicerequestModel = require('../models/Servicerequest');
const CompletedRequestModel = require('../models/CompletedRequest');
const InProgressRequestModel = require('../models/InProgressRequest');

const getRequest = async (req, res) => {
  try {
    const requests = await ServicerequestModel.find();
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCompletedRequests = async (req, res) => {
  try {
    const completed = await CompletedRequestModel.find();
    res.json(completed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getInProgressRequests = async (req, res) => {
  try {
    const inProgress = await InProgressRequestModel.find({ status: "In Progress" });
    res.json(inProgress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const createRequest = async (req, res) => {
  try {
    const newRequest = new ServicerequestModel(req.body);
    const savedRequest = await newRequest.save();
    res.json(savedRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateRequest = async (req, res) => {
  try {
    const updatedRequest = await ServicerequestModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRequest) {
      return res.status(404).json({ error: "Request not found" });
    }
    res.json(updatedRequest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const request = await ServicerequestModel.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const plainRequest = request.toObject();
    delete plainRequest._id; // Remove MongoDB _id before archiving

    if (request.status === "Completed") {
      await CompletedRequestModel.create(plainRequest);
      console.log("✅ Archived completed request:", plainRequest);
    } else if (request.status === "In Progress") {
      await InProgressRequestModel.create(plainRequest);
      console.log("📥 Archived in-progress request:", plainRequest);
    }

    await ServicerequestModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Request deleted and archived (if applicable)" });

  } catch (err) {
    console.error("❌ Error in deleteRequest:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getRequest,
  getCompletedRequests,
  getInProgressRequests,
  createRequest,
  updateRequest,
  deleteRequest,
};
