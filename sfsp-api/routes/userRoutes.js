const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', authMiddleware, userController.logout);

router.get('/profile', authMiddleware, userController.getProfile);
router.delete('/profile', authMiddleware, userController.deleteProfile);
router.post('/token_refresh', authMiddleware, userController.refreshToken);
router.put('/profile', authMiddleware, userController.updateProfile);
router.post('/verify-password', authMiddleware, userController.verifyPassword);
router.post('/send-reset-pin', authMiddleware, userController.sendResetPIN);
router.post('/change-password', authMiddleware, userController.changePassword);
router.get('/public-keys/:userId', userController.getPublicKeys);
router.get('/getUserId/:email', userController.getUserIdFromEmail);
router.post('/get-token', userController.getUserToken);
router.get('/token-info', userController.getUserInfoFromToken);

module.exports = router;