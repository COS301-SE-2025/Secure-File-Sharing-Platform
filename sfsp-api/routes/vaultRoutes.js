const express = require('express');
const vaultController = require('../controllers/vaultController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/health', vaultController.healthCheck);
router.post('/store-key', authMiddleware, vaultController.storeKeyBundle);
router.get('/retrieve-key', authMiddleware, vaultController.retrieveKeyBundle);
router.delete('/delete-key', authMiddleware, vaultController.deleteKeyBundle);

module.exports = router;