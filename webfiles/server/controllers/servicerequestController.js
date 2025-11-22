const ServicerequestModel = require('../models/Servicerequest');
const CompletedRequestModel = require('../models/CompletedRequest');
const InProgressRequestModel = require('../models/InProgressRequest');
const logAudit = require('./logAudit');



const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyCh4W_HgKVepfvay7fSu4MNfu3RtEYPxE8"); // API key

// async function calculateDurationWithGemini(start, end) {
//   const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
//   const prompt = `
//     Calculate the duration in minutes between these two timestamps:
//     - Start: ${start}
//     - End: ${end}
//     Return just the number of minutes as an integer.
//   `;
//   const result = await model.generateContent(prompt);
//   const response = await result.response;
//   const text = response.text();
//   // Extract number from the response text (in case Gemini adds extra words)
//   const duration = parseInt(text.match(/\d+/)?.[0]);
//   return isNaN(duration) ? null : duration;
// }

// Use a fallback duration calculation (difference in minutes)
function calculateDurationWithGemini(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate - startDate;
  const diffMins = Math.round(diffMs / 60000);
  return diffMins;
}



const getRequest = (req, res) => {
    ServicerequestModel.find()
    .then(request => res.json(request))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
};

// Get a single service request by ID
const getRequestById = (req, res) => {
  ServicerequestModel.findById(req.params.id)
    .then(request => {
      if (!request) {
        return res.status(404).json({ error: 'Service request not found' });
      }
      res.json(request);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
};



const deleteRequest = async (req, res) => {
  try {
    const deletedRequest = await ServicerequestModel.findByIdAndDelete(req.params.id);
    if (deletedRequest) {
      await logAudit({
        action: 'delete',
        resource: 'ServiceRequest',
        resourceId: req.params.id,
        performedBy: req.session?.user?.name || 'Unknown',
        details: { deletedRequest }
      });
      res.json({ message: "Service deleted" });
    } else {
      res.status(404).json({ error: "Service not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const getCompletedRequests = (req, res) => {
  CompletedRequestModel.find()
    .then(data => res.json(data))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
};

const getInProgressRequests = (req, res) => {
  InProgressRequestModel.find({ status: "In Progress" })
    .then(data => res.json(data))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
};




  const createRequest = async (req, res) => {
    try {
      const preparedBy = req.session?.user?.name || 'Unknown';
      let predictedMinutes = null;
      // Predict service time if unitName and service are present
      if (req.body.unitName && req.body.service && Array.isArray(req.body.service) && req.body.service.length > 0) {
        try {
          // Compose a prompt for Gemini
          const prompt = `Given the unit name: ${req.body.unitName} and the following services: ${req.body.service.join(", ")}, predict the estimated time in minutes required to complete all services for this unit. Return only the number of minutes as an integer.`;
          const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          predictedMinutes = parseInt(text.match(/\d+/)?.[0]);
        } catch (err) {
          predictedMinutes = null; // fallback if AI fails
        }
      }
      const newRequest = new ServicerequestModel({
        ...req.body,
        preparedBy,
        serviceTime: predictedMinutes // save prediction
      });
      const request = await newRequest.save();
      await logAudit({
        action: 'create',
        resource: 'ServiceRequest',
        resourceId: request._id,
        performedBy: preparedBy,
        details: { newRequest: request }
      });
      res.json(request);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  

const updateRequest = async (req, res) => {
  try {
    const preparedBy = req.session?.user?.name || 'Unknown';
    const request = await ServicerequestModel.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const previousStatus = request.status;
    const newStatus = req.body.status;

    //  Set inProgressAt if status changes to "In Progress"
   if (newStatus === "In Progress" && previousStatus !== "In Progress") {
  request.inProgressAt = new Date();
  await request.save(); // Save this change
}


    //  If status changes to Completed
    if (newStatus === "Completed" && previousStatus !== "Completed") {
      const completedAt = new Date();
      req.body.completedAt = completedAt;

      //  Calculate duration with Gemini (only if inProgressAt exists)
      if (request.inProgressAt || req.body.inProgressAt) {
        const start = request.inProgressAt || req.body.inProgressAt;
        const duration = calculateDurationWithGemini(start, completedAt);
        req.body.serviceDurationMinutes = duration;
        console.log(" Calculated Duration:", duration);

      } else {
        req.body.serviceDurationMinutes = null;
      }
    }

    const updatedRequest = await ServicerequestModel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, preparedBy },
      { new: true }
    );

    //  Archive completed requests
    if (newStatus === "Completed" && previousStatus !== "Completed") {
      const plainRequest = updatedRequest.toObject();
      delete plainRequest._id;

      console.log(" Archiving request with duration:", plainRequest.serviceDurationMinutes);
      await CompletedRequestModel.create(plainRequest);
      await ServicerequestModel.findByIdAndDelete(req.params.id);

      return res.json({
        message: "Request updated, archived, and removed from active list.",
        duration: req.body.serviceDurationMinutes
      });
    }

    await logAudit({
      action: 'update',
      resource: 'ServiceRequest',
      resourceId: req.params.id,
      performedBy: preparedBy,
      details: { updatedRequest }
    });
    res.json(updatedRequest);
  } catch (err) {
    console.error("❌ Error in updateRequest:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// AI-powered prediction for service time
const predictServiceTime = async (req, res) => {
  try {
    const { unitName, service } = req.body;
    if (!unitName || !service || !Array.isArray(service) || service.length === 0) {
      return res.status(400).json({ error: "unitName and service[] are required" });
    }

    // Compose a prompt for Gemini
    const prompt = `Given the unit name: ${unitName} and the following services: ${service.join(", ")}, predict the estimated time in minutes required to complete all services for this unit. Return only the number of minutes as an integer.`;
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const predictedMinutes = parseInt(text.match(/\d+/)?.[0]);
    if (isNaN(predictedMinutes)) {
      return res.status(500).json({ error: "AI did not return a valid prediction." });
    }
    res.json({ predictedMinutes });
  } catch (err) {
    console.error("❌ Error in predictServiceTime:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getRequest,
  getRequestById,
  deleteRequest,
  createRequest,
  updateRequest,
  getCompletedRequests,
  getInProgressRequests,
  
  predictServiceTime, // 
};

