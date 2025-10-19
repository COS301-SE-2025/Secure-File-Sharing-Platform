require('dotenv').config();
const express = require('express');
const userRoutes = require('./userRoutes');
const fileRoutes = require('./fileRoutes');
const contactRoutes = require('./contactRoutes');
const vaultRoutes = require('./vaultRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes=require('./adminRoutes');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/files', fileRoutes);
router.use('/contact', contactRoutes);
router.use('/vault', vaultRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

router.get('/health', async (_req, res) => {
    const services = {};

    try {
        const keyServiceResponse = await fetch(process.env.KEY_SERVICE_URL || 'http://localhost:5000/api/vault/health');
        if (keyServiceResponse.ok) {
            services.keyservice = 'connected';
        } else {
            services.keyservice = 'disconnected';
        }
    } catch {
        services.keyservice = 'disconnected';
    }

    try {
        const fileServiceResponse = await fetch(process.env.FILE_SERVICE_URL || 'http://localhost:8081/health');
        if (fileServiceResponse.ok) {
            services.fileservice = 'connected';
        } else {
            services.fileservice = 'disconnected';
        }
    } catch {
        services.fileservice = 'disconnected';
    }

    const allConnected = Object.values(services).every(status => status === 'connected');
    const status = allConnected ? 'healthy' : 'degraded';

    res.status(200).json({
        success: true,
        status: status,
        message: 'Main API health check',
        services: services
    });
});

module.exports = router;