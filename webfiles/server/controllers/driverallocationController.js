const DriverallocationModel = require('../models/Driverallocation');
const CompletedAllocationModel = require('../models/CompletedAllocation');
const logAudit = require('./logAudit');

const getAllocation = (req, res) => {
  DriverallocationModel.find()
    .then(allocation => res.json(allocation))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
};

const deleteAllocation  = async (req, res) => {
  try {
    const deletedAllocation = await DriverallocationModel.findByIdAndDelete(req.params.id);
    if (deletedAllocation) {
      await logAudit({
        action: 'delete',
        resource: 'DriverAllocation',
        resourceId: req.params.id,
        performedBy: req.session?.user?.name || 'Unknown',
        details: { deletedAllocation }
      });
      res.json({ message: "Driver allocation deleted" });
    } else {
      res.status(404).json({ error: "Driver allocation not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const createAllocation  = async (req, res) => {
  try {
    const allocatedBy = req.session?.user?.name || 'Unknown';
    const newAllocation = new DriverallocationModel({
      ...req.body,
      allocatedBy
    });
    const allocation = await newAllocation.save();
    await logAudit({
      action: 'create',
      resource: 'DriverAllocation',
      resourceId: allocation._id,
      performedBy: allocatedBy,
      details: { newAllocation: allocation }
    });
    res.json(allocation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateAllocation = async (req, res) => {
  try {
    const allocatedBy = req.session?.user?.name || 'Unknown';
    const allocation = await DriverallocationModel.findById(req.params.id);
    if (!allocation) {
      return res.status(404).json({ error: "Allocation not found" });
    }
    const previousStatus = allocation.status;
    const updatedAllocation = await DriverallocationModel.findByIdAndUpdate(
      req.params.id,
      { ...req.body, allocatedBy },
      { new: true }
    );
    // Build a human-readable change summary (exclude _id, createdAt, updatedAt)
    let changes = [];
    const excludeFields = ['_id', 'createdAt', 'updatedAt', '__v'];
    if (allocation && updatedAllocation) {
      Object.keys(req.body).forEach(key => {
        if (!excludeFields.includes(key) && allocation[key] !== updatedAllocation[key]) {
          changes.push(`${key} changed from ${allocation[key]} to ${updatedAllocation[key]}`);
        }
      });
    }
    await logAudit({
      action: 'update',
      resource: 'DriverAllocation',
      resourceId: req.params.id,
      performedBy: allocatedBy,
      details: {
        summary: changes.length ? changes.join('; ') : 'No changes detected',
        before: allocation,
        after: updatedAllocation
      }
    });
    // If status changed to "Completed"
    if (req.body.status === "Completed" && previousStatus !== "Completed") {
      const archived = updatedAllocation.toObject();
      delete archived._id;
      await CompletedAllocationModel.create(archived);
      await DriverallocationModel.findByIdAndDelete(req.params.id);
      return res.json({ message: "Allocation completed, archived, and removed from active list." });
    }
    res.json(updatedAllocation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const getCompletedAllocations = async (req, res) => {
  try {
    const data = await CompletedAllocationModel.find();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


module.exports = { getAllocation, deleteAllocation, createAllocation, updateAllocation,getCompletedAllocations };
