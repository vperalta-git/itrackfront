const InventoryModel = require('../models/Inventory');
const logAudit = require('./logAudit');


const getStock = (req, res) => {
    InventoryModel.find()
    .then(stock => res.json(stock ))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
};

const deleteStock = async (req, res) => {
  try {
    const deletedStock = await InventoryModel.findByIdAndDelete(req.params.id);
    if (deletedStock) {
      await logAudit({
        action: 'delete',
        resource: 'Inventory',
        resourceId: req.params.id,
        performedBy: req.session?.user?.name || 'Unknown',
        details: { deletedStock }
      });
      res.json({ message: "stock deleted" });
    } else {
      res.status(404).json({ error: "Stock not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const createStock = async (req, res) => {
  try {
    const newStock = new InventoryModel(req.body);
    const stock = await newStock.save();
    await logAudit({
      action: 'create',
      resource: 'Inventory',
      resourceId: stock._id,
      performedBy: req.session?.user?.name || 'Unknown',
      details: { newStock: stock }
    });
    res.json(stock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateStock = async (req, res) => {
  try {
    const before = await InventoryModel.findById(req.params.id);
    const stock = await InventoryModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    // Build a human-readable change summary
    let changes = [];
    if (before && stock) {
      Object.keys(req.body).forEach(key => {
        if (before[key] !== stock[key]) {
          changes.push(`${key} changed from ${before[key]} to ${stock[key]}`);
        }
      });
    }
    await logAudit({
      action: 'update',
      resource: 'Inventory',
      resourceId: req.params.id,
      performedBy: req.session?.user?.name || 'Unknown',
      details: {
        summary: changes.length ? changes.join('; ') : 'No changes detected',
        before,
        after: stock
      }
    });
    res.json(stock);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getStock,deleteStock,createStock,updateStock };
