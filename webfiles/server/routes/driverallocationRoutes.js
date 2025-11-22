const express = require('express');
const router = express.Router();
const driverallocationController = require('../controllers/driverallocationController');
const requireAuth = require('../middleware/authMiddleware');


router.get('/getAllocation', requireAuth, driverallocationController.getAllocation);
router.delete('/deleteAllocation/:id', requireAuth, driverallocationController.deleteAllocation);
router.post('/createAllocation', requireAuth, driverallocationController.createAllocation);
router.put('/updateAllocation/:id', requireAuth, driverallocationController.updateAllocation);
router.get('/getCompletedAllocations', requireAuth, driverallocationController.getCompletedAllocations);

module.exports = router;




