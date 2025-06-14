const express = require('express');
const userRoutes = require('./userRoutes');
const fileRoutes = require('./fileRoutes');
const contactRoutes = require('./contactRoutes');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/files', fileRoutes);
router.use('/contact', contactRoutes);

router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running'
    });
});

module.exports = router;