/* global process */
const jwt = require('jsonwebtoken');
const {supabase} = require('../config/database');

const authMiddleware = async (req, res, next) => {
    try{
        const authHeader = req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token is required.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const {data: user, error} = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication token.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Authentication failed: ' + error.message
        });
    }
};

module.exports = authMiddleware;