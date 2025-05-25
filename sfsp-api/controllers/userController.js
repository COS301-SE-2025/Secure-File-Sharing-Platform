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

}