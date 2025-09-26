const express = require('express');
const vaultController = require('../controllers/vaultController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const vaultService = new vaultController();

router.get('/health', async (req, res) => {
    try {
        const health = await vaultService.healthCheck();
        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to check vault health',
            error: error.message
        });
    }
});

router.post('/store-key', authMiddleware, async (req, res) => {
    try {
        const result = await vaultService.storeKeyBundle(req.body);
        res.status(result.statusCode).json(result.data);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message
        });
    }
});

router.get('/retrieve-key/:id', authMiddleware, async (req, res) => {
    try {
        const result = await vaultService.retrieveKeyBundle(req.params.id);
        res.status(result.statusCode).json(result.data);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message
        });
    }
});

router.delete('/delete-key/:id', authMiddleware, async (req, res) => {
    try {
        const result = await vaultService.deleteKeyBundle(req.params.id);
        res.status(result.statusCode).json(result.data);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;