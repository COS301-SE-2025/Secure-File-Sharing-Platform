const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/get', notificationController.getNotifications);
router.post('/markAsRead', notificationController.markAsRead);
router.post('/respond', notificationController.respondToShareRequest);
router.post('/clear', notificationController.clearNotification);
router.post('/add', notificationController.addNotification);

module.exports = router;