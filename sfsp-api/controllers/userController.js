const userService = require('../services/userService');

class UserController {
    async register(req, res) {
        try {
            const {username, email, password} = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, email, and password are required.'
                });
            }

            const result = await userService.register({username, email, password});
            return res.status(201).json({
                success: true,
                message: 'User registered successfully.',
                data: result
            });
        } catch (error) {
            console.error('Error registering user:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error.'
            });
        }
    }

    async login(req, res) {
        try {
            const {email, password} = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required.'
                });
            }

            const result = await userService.login({email, password});
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: result
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }

    async getProfile(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Authorization token missing or invalid.'
                });
            }

            const token = authHeader.split(' ')[1];
            const decoded = await userService.verifyToken(token);
            if (!decoded || !decoded.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token.'
                });
            }
            const userId = decoded.userId;

            const profile = await userService.getProfile(userId);
            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: 'User profile not found.'
                });
            }

            return res.status(200).json({
                success: true,
                data: profile
            });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error.'
            });
        }
    }

    async refreshToken(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required.'
                });
            }

            const token = await userService.refreshToken(email);
            return res.status(200).json({
                success: true,
                message: 'Token refreshed successfully.',
                token
            });
        } catch (error) {
            console.error('Error refreshing token:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error.'
            });
        }
    }

    async deleteProfile(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                message: 'Email is required.'
                });
            }

            const result = await userService.deleteProfile(email);
            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: 'User profile not found.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'User profile deleted successfully.'
            });
        } catch (error) {
            console.error('Error deleting user profile:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error.'
            });
        }
    }
}

module.exports = new UserController();