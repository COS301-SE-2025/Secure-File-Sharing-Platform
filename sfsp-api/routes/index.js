const express = require('express');
const userRoutes = require('./userRoutes');
const fileRoutes = require('./fileRoutes');
const contactRoutes = require('./contactRoutes');
const vaultRoutes = require('./vaultRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/files', fileRoutes);
router.use('/contact', contactRoutes);
router.use('/vault', vaultRoutes);
router.use('/notifications', notificationRoutes);

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running'
    });
});

module.exports = router;