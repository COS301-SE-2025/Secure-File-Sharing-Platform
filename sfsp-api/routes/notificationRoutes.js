const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/get',authMiddleware, notificationController.getNotifications);
router.post('/markAsRead',authMiddleware, notificationController.markAsRead);
router.post('/respond',authMiddleware, notificationController.respondToShareRequest);
router.post('/clear',authMiddleware, notificationController.clearNotification);
router.post('/add',authMiddleware, notificationController.addNotification);

module.exports = router;