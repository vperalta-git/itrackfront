const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Existing routes
router.get('/getUsers', userController.getUsers);
router.delete('/deleteUser/:id', userController.deleteUser);
router.post('/createUser', userController.createUser);
router.put('/updateUser/:id', userController.updateUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.post('/send-reset-links', userController.sendResetLinksToAll);

// New profile management routes
router.get('/profile/:id', userController.getUserProfile);
router.put('/profile/:id', userController.updateUserProfile);
router.post('/profile/:id/upload-picture', userController.uploadProfilePicture);
router.get('/managers', userController.getManagers);
router.get('/agents/:managerId', userController.getAgentsByManager);

module.exports = router;


