const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');


router.get('/getStock', inventoryController.getStock);
router.delete('/deleteStock/:id', inventoryController.deleteStock);
router.post('/createStock', inventoryController.createStock);
router.put('/updateStock/:id', inventoryController.updateStock);

module.exports = router;
