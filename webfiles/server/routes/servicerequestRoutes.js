const express = require('express');
const router = express.Router();
const servicerequestController = require('../controllers/servicerequestController');
const requireAuth = require('../middleware/authMiddleware');

router.get('/getRequest', requireAuth, servicerequestController.getRequest);
router.get('/getRequest/:id', requireAuth, servicerequestController.getRequestById);
router.get('/getCompletedRequests', requireAuth, servicerequestController.getCompletedRequests);

// Predict service time (AI)
router.post('/predictServiceTime', requireAuth, servicerequestController.predictServiceTime);

router.delete('/deleteRequest/:id', requireAuth, servicerequestController.deleteRequest);
router.post('/createRequest', requireAuth, servicerequestController.createRequest);
router.put('/updateRequest/:id', requireAuth, servicerequestController.updateRequest);


module.exports = router;
