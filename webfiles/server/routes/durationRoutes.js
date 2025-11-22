const express = require('express');
const router = express.Router();
const { calculateDuration } = require('../controllers/durationController');

router.post('/calculate-duration', calculateDuration);

module.exports = router;
