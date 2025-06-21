const bcrypt = require('bcrypt');
const { supabase } = require('../config/database');
const userService = require('../services/userService');
const axios = require('axios');

class UserController {
    async register(req, res) {
        try {
            const { username, email, password } = req.body;
            const { ik_public, spk_public, opks_public, nonce, signedPreKeySignature, salt } = req.body;
            const { ik_private_key, spk_private_key, opks_private } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, email, and password are required.'
                });
            }

            if (!ik_public || !spk_public || !opks_public || !nonce || !signedPreKeySignature || !salt) {
                return res.status(400).json({
                    success: false,
                    message: 'Public keys are required.'
                });
            }

            if (!ik_private_key || !spk_private_key || !opks_private) {
                return res.status(400).json({
                    success: false,
                    message: 'Private keys are required.'
                });
            }

            const result = await userService.register({ username, email, password, ik_public, spk_public, opks_public, nonce, signedPreKeySignature, salt });
            if (result && result.user && result.user.id) {
                const vaultres = await axios.post('http://localhost:8080/store-key', {
                    encrypted_id: result.user.id,
                    ik_private_key,
                    spk_private_key,
                    opks_private
                });

                if (!vaultres.status == 201 && !vaultres.data.status == 'success') {
                    return res.status(500).json({
                        success: false,
                        message: vaultres.data.error
                    });
                }
            }

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
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required.'
                });
            }

            const result = await userService.login({ email, password });
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

    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({
                    success: false,
                    message: 'Username is required.'
                });
            }

            const updatedUser = await userService.updateProfile(userId, { username });

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully.',
                data: updatedUser
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile.'
            });
        }
    }

    async logout(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: 'Authorization token missing or invalid.'
                });
            }
            const token = authHeader.split(' ')[1];
            const result = await userService.logout(token);
            if (!result) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token.'
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Logout successful.'
            });
        } catch (error) {
            console.error('Error during logout:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error.'
            });
        }
    }

    async verifyPassword(req, res) {
        try {
            const { currentPassword } = req.body;
            const userId = req.user.id;

            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required'
                });
            }

            const { data: user, error } = await supabase
                .from('users')
                .select('password')
                .eq('id', userId)
                .single();

            if (error || !user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            res.json({
                success: true,
                message: 'Password verified successfully'
            });
        } catch (error) {
            console.error('Error verifying password:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    async sendResetPIN(req, res) {
        try {
            const userId = req.user.id;

            const result = await userService.sendPasswordResetPIN(userId);

            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error sending reset PIN:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to send reset PIN'
            });
        }
    }

    async changePassword(req, res) {
        try {
            const { pin, newPassword } = req.body;
            const userId = req.user.id;

            if (!pin || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'PIN and new password are required'
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long'
                });
            }

            const result = await userService.verifyPINAndChangePassword(userId, pin, newPassword);

            res.json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to change password'
            });
        }
    }
}

module.exports = new UserController();