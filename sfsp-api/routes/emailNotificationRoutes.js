// routes/emailNotificationRoutes.js
const express = require('express');
const router = express.Router();
const emailNotificationController = require('../controllers/emailNotificationController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/storage-alert', emailNotificationController.checkStorageAlert);

router.post('/large-deletion-alert', emailNotificationController.checkLargeDeletionAlert);

router.post('/browser-signin-alert', emailNotificationController.sendNewBrowserSignInAlert);

router.post('/device-linked-alert', emailNotificationController.sendNewDeviceLinkedAlert);

router.post('/app-connected-alert', emailNotificationController.sendNewAppConnectedAlert);

router.post('/weekly-digest', emailNotificationController.sendWeeklyDigest);

router.post('/weekly-digest-all', emailNotificationController.sendAllWeeklyDigests);

module.exports = router;
