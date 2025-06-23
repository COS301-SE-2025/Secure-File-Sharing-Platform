/* global describe, it, expect, beforeEach, afterEach, jest */
const UserController = require('../controllers/userController');
const { supabase } = require('../config/database');
const userService = require('../services/userService');
const VaultController = require('../controllers/vaultController');
const bcrypt = require('bcrypt');

jest.mock('../services/userService');
userService.logout = jest.fn();

jest.mock('../config/database', () => {
    const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    return { supabase: mockSupabase };
});

jest.mock('bcrypt');
jest.mock('../controllers/vaultController');

describe('UserController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: {},
            headers: {},
            user: { id: 1 },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('register', () => {
        it('should register a user successfully', async () => {
        req.body = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            ik_public: 'ik_public_key',
            spk_public: 'spk_public_key',
            opks_public: ['opk1', 'opk2'],
            nonce: 'nonce_value',
            signedPrekeySignature: 'signature',
            salt: 'salt_value',
            ik_private_key: 'ik_private_key',
            spk_private_key: 'spk_private_key',
            opks_private: ['opk_private1', 'opk_private2'],
        };

        const mockResult = {
            user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            },
            token: 'mock-jwt-token',
        };

        userService.register.mockResolvedValue(mockResult);
        VaultController.storeKeyBundle.mockResolvedValue({ success: true });

        await UserController.register(req, res);

        expect(userService.register).toHaveBeenCalledWith({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            ik_public: 'ik_public_key',
            spk_public: 'spk_public_key',
            opks_public: ['opk1', 'opk2'],
            nonce: 'nonce_value',
            signedPrekeySignature: 'signature',
            salt: 'salt_value',
        });
        expect(VaultController.storeKeyBundle).toHaveBeenCalledWith({
            encrypted_id: 1,
            ik_private_key: 'ik_private_key',
            spk_private_key: 'spk_private_key',
            opks_private: ['opk_private1', 'opk_private2'],
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'User registered successfully.',
            data: mockResult,
        });
        });

        it('should return 400 when username is missing', async () => {
        req.body = {
            email: 'test@example.com',
            password: 'password123',
            ik_public: 'ik_public_key',
            spk_public: 'spk_public_key',
            opks_public: ['opk1'],
            nonce: 'nonce_value',
            signedPrekeySignature: 'signature',
            salt: 'salt_value',
            ik_private_key: 'ik_private_key',
            spk_private_key: 'spk_private_key',
            opks_private: ['opk_private1'],
        };

        await UserController.register(req, res);

        expect(userService.register).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Username, email, and password are required.',
        });
        });

        it('should return 400 when email is missing', async () => {
        req.body = {
            username: 'testuser',
            password: 'password123',
            ik_public: 'ik_public_key',
            spk_public: 'spk_public_key',
            opks_public: ['opk1'],
            nonce: 'nonce_value',
            signedPrekeySignature: 'signature',
            salt: 'salt_value',
            ik_private_key: 'ik_private_key',
            spk_private_key: 'spk_private_key',
            opks_private: ['opk_private1'],
        };

        await UserController.register(req, res);

        expect(userService.register).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Username, email, and password are required.',
        });
        });

        it('should return 400 when password is missing', async () => {
        req.body = {
            username: 'testuser',
            email: 'test@example.com',
            ik_public: 'ik_public_key',
            spk_public: 'spk_public_key',
            opks_public: ['opk1'],
            nonce: 'nonce_value',
            signedPrekeySignature: 'signature',
            salt: 'salt_value',
            ik_private_key: 'ik_private_key',
            spk_private_key: 'spk_private_key',
            opks_private: ['opk_private1'],
        };

        await UserController.register(req, res);

        expect(userService.register).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Username, email, and password are required.',
        });
        });

        it('should return 400 when public keys are missing', async () => {
        req.body = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            ik_private_key: 'ik_private_key',
            spk_private_key: 'spk_private_key',
            opks_private: ['opk_private1'],
        };

        await UserController.register(req, res);

        expect(userService.register).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Username, email, and password are required.',
        });
        });

        it('should return 400 when private keys are missing', async () => {
        req.body = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            ik_public: 'ik_public_key',
            spk_public: 'spk_public_key',
            opks_public: ['opk1'],
            nonce: 'nonce_value',
            signedPrekeySignature: 'signature',
            salt: 'salt_value',
        };

        await UserController.register(req, res);

        expect(userService.register).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Username, email, and password are required.',
        });
        });

        it('should return 500 when userService.register throws an error', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                ik_public: 'ik_public_key',
                spk_public: 'spk_public_key',
                opks_public: ['opk1', 'opk2'],
                nonce: 'nonce_value',
                signedPrekeySignature: 'signature',
                salt: 'salt_value',
                ik_private_key: 'ik_private_key',
                spk_private_key: 'spk_private_key',
                opks_private: ['opk_private1', 'opk_private2'],
            };

            userService.register.mockRejectedValue(new Error('Registration failed'));

            await UserController.register(req, res);

            expect(userService.register).toHaveBeenCalledWith({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                ik_public: 'ik_public_key',
                spk_public: 'spk_public_key',
                opks_public: ['opk1', 'opk2'],
                nonce: 'nonce_value',
                signedPrekeySignature: 'signature',
                salt: 'salt_value',
            });
            expect(VaultController.storeKeyBundle).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error.',
            });
        });

        it('should return 500 when VaultController.storeKeyBundle fails', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                ik_public: 'ik_public_key',
                spk_public: 'spk_public_key',
                opks_public: ['opk1', 'opk2'],
                nonce: 'nonce_value',
                signedPrekeySignature: 'signature',
                salt: 'salt_value',
                ik_private_key: 'ik_private_key',
                spk_private_key: 'spk_private_key',
                opks_private: ['opk_private1', 'opk_private2'],
            };

            const mockResult = {
                user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                },
                token: 'mock-jwt-token',
            };

            userService.register.mockResolvedValue(mockResult);
            VaultController.storeKeyBundle.mockResolvedValue({ error: 'Vault error' });

            await UserController.register(req, res);

            expect(userService.register).toHaveBeenCalledWith({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                ik_public: 'ik_public_key',
                spk_public: 'spk_public_key',
                opks_public: ['opk1', 'opk2'],
                nonce: 'nonce_value',
                signedPrekeySignature: 'signature',
                salt: 'salt_value',
            });

            expect(VaultController.storeKeyBundle).toHaveBeenCalledWith({
                encrypted_id: 1,
                ik_private_key: 'ik_private_key',
                spk_private_key: 'spk_private_key',
                opks_private: ['opk_private1', 'opk_private2'],
            });

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Vault error',
            });
        });
    });

    describe('login', () => {
        it('should login user successfully', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'password123',
            };

            const mockResult = {
                user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                },
                token: 'mock-jwt-token',
            };
            const mockKeyBundle = {
                ik_private_key: 'ik_private_key',
                spk_private_key: 'spk_private_key',
                opks_private: ['opk_private1'],
            };

            userService.login.mockResolvedValue(mockResult);
            VaultController.retrieveKeyBundle.mockResolvedValue(mockKeyBundle);

            await UserController.login(req, res);

            expect(userService.login).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(VaultController.retrieveKeyBundle).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Login successful',
                data: { ...mockResult, keyBundle: mockKeyBundle },
            });
        });

        it('should return 400 when email is missing', async () => {
            req.body = {
                password: 'password123',
            };

            await UserController.login(req, res);

            expect(userService.login).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email and password are required.',
            });
        });

        it('should return 400 when password is missing', async () => {
            req.body = {
                email: 'test@example.com',
            };

            await UserController.login(req, res);

            expect(userService.login).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email and password are required.',
            });
        });

        it('should return 401 when login fails', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'wrongpassword',
            };

            userService.login.mockRejectedValue(new Error('Invalid password.'));

            await UserController.login(req, res);

            expect(userService.login).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'wrongpassword',
            });
            expect(VaultController.retrieveKeyBundle).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid password.',
            });
        });
    });

    describe('getProfile', () => {
        it('should get user profile successfully', async () => {
            req.headers.authorization = 'Bearer valid-token';

            const mockProfile = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com'
            };

            userService.verifyToken.mockResolvedValue({ userId: 1 });
            userService.getProfile.mockResolvedValue(mockProfile);

            await UserController.getProfile(req, res);

            expect(userService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(userService.getProfile).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockProfile
            });
        });

        it('should return 401 when authorization header is missing', async () => {
            req.headers = {};

            await UserController.getProfile(req, res);

            expect(userService.verifyToken).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authorization token missing or invalid.'
            });
        });

        it('should return 401 when authorization header does not start with Bearer', async () => {
            req.headers.authorization = 'Basic invalid-token';

            await UserController.getProfile(req, res);

            expect(userService.verifyToken).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authorization token missing or invalid.'
            });
        });

        it('should return 401 when token is invalid', async () => {
            req.headers.authorization = 'Bearer invalid-token';

            userService.verifyToken.mockRejectedValue(new Error('Invalid token'));

            await UserController.getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error.'
            });
        });

        it('should return 401 when decoded token has no userId', async () => {
            req.headers.authorization = 'Bearer valid-token';

            userService.verifyToken.mockResolvedValue({});

            await UserController.getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid or expired token.'
            });
        });

        it('should return 404 when user profile is not found', async () => {
            req.headers.authorization = 'Bearer valid-token';

            userService.verifyToken.mockResolvedValue({ userId: 1 });
            userService.getProfile.mockResolvedValue(null);

            await UserController.getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User profile not found.'
            });
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            req.body = {
                email: 'test@example.com'
            };

            const mockToken = 'new-jwt-token';
            userService.refreshToken.mockResolvedValue(mockToken);

            await UserController.refreshToken(req, res);

            expect(userService.refreshToken).toHaveBeenCalledWith('test@example.com');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Token refreshed successfully.',
                token: mockToken
            });
        });

        it('should return 400 when email is missing', async () => {
            req.body = {};

            await UserController.refreshToken(req, res);

            expect(userService.refreshToken).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email is required.'
            });
        });

        it('should return 500 when userService.refreshToken throws an error', async () => {
            req.body = {
                email: 'test@example.com'
            };

            userService.refreshToken.mockRejectedValue(new Error('User not found'));

            await UserController.refreshToken(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error.'
            });
        });
    });

    describe('deleteProfile', () => {
        it('should delete user profile successfully', async () => {
            req.body = {
                email: 'test@example.com'
            };

            const mockResult = { message: 'Profile deleted successfully.' };
            userService.deleteProfile.mockResolvedValue(mockResult);

            await UserController.deleteProfile(req, res);

            expect(userService.deleteProfile).toHaveBeenCalledWith('test@example.com');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'User profile deleted successfully.'
            });
        });

        it('should return 400 when email is missing', async () => {
            req.body = {};

            await UserController.deleteProfile(req, res);

            expect(userService.deleteProfile).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email is required.'
            });
        });

        it('should return 404 when user profile is not found', async () => {
            req.body = {
                email: 'nonexistent@example.com'
            };

            userService.deleteProfile.mockResolvedValue(null);

            await UserController.deleteProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User profile not found.'
            });
        });

        it('should return 500 when userService.deleteProfile throws an error', async () => {
            req.body = {
                email: 'test@example.com'
            };

            userService.deleteProfile.mockRejectedValue(new Error('Database error'));

            await UserController.deleteProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error.'
            });
        });
    });

    describe('verifyPassword', () => {
        it('should verify password successfully', async () => {
            req.body = { currentPassword: 'password123' };

            const mockUser = { password: 'hashedPassword' };
            supabase.single.mockResolvedValue({ data: mockUser, error: null });
            bcrypt.compare.mockResolvedValue(true);

            await UserController.verifyPassword(req, res);

            expect(supabase.from).toHaveBeenCalledWith('users');
            expect(supabase.select).toHaveBeenCalledWith('password');
            expect(supabase.eq).toHaveBeenCalledWith('id', 1);
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Password verified successfully',
            });
        });

        it('should return 400 when currentPassword is missing', async () => {
            req.body = {};

            await UserController.verifyPassword(req, res);

            expect(supabase.from).not.toHaveBeenCalled();
            expect(bcrypt.compare).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Current password is required',
            });
        });

        it('should return 404 when user is not found', async () => {
            req.body = { currentPassword: 'password123' };

            supabase.single.mockResolvedValue({ data: null, error: new Error('Not found') });

            await UserController.verifyPassword(req, res);

            expect(supabase.from).toHaveBeenCalledWith('users');
            expect(supabase.select).toHaveBeenCalledWith('password');
            expect(supabase.eq).toHaveBeenCalledWith('id', 1);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found',
            });
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should return 400 when password is incorrect', async () => {
            req.body = { currentPassword: 'password123' };

            const mockUser = { password: 'hashedPassword' };
            supabase.single.mockResolvedValue({ data: mockUser, error: null });
            bcrypt.compare.mockResolvedValue(false);

            await UserController.verifyPassword(req, res);

            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Current password is incorrect',
            });
        });

        it('should return 500 when an error occurs', async () => {
            req.body = { currentPassword: 'password123' };

            supabase.single.mockRejectedValue(new Error('Database error'));

            await UserController.verifyPassword(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error',
            });
        });
    });

    describe('sendResetPIN', () => {
        it('should send reset PIN successfully', async () => {
            const mockResult = { message: 'PIN sent successfully' };
            userService.sendPasswordResetPIN.mockResolvedValue(mockResult);

            await UserController.sendResetPIN(req, res);

            expect(userService.sendPasswordResetPIN).toHaveBeenCalledWith(1);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'PIN sent successfully',
            });
        });

        it('should return 500 when userService.sendPasswordResetPIN throws an error', async () => {
            userService.sendPasswordResetPIN.mockRejectedValue(new Error('Failed to send PIN'));

            await UserController.sendResetPIN(req, res);

            expect(userService.sendPasswordResetPIN).toHaveBeenCalledWith(1);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to send PIN',
            });
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            req.body = { pin: '123456', newPassword: 'newPassword123' };

            const mockResult = { message: 'Password changed successfully' };
            userService.verifyPINAndChangePassword.mockResolvedValue(mockResult);

            await UserController.changePassword(req, res);

            expect(userService.verifyPINAndChangePassword).toHaveBeenCalledWith(1, '123456', 'newPassword123');
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Password changed successfully',
            });
        });

        it('should return 400 when pin is missing', async () => {
            req.body = { newPassword: 'newPassword123' };

            await UserController.changePassword(req, res);

            expect(userService.verifyPINAndChangePassword).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'PIN and new password are required',
            });
        });

        it('should return 400 when newPassword is missing', async () => {
            req.body = { pin: '123456' };

            await UserController.changePassword(req, res);

            expect(userService.verifyPINAndChangePassword).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'PIN and new password are required',
            });
        });

        it('should return 400 when newPassword is too short', async () => {
            req.body = { pin: '123456', newPassword: 'short' };

            await UserController.changePassword(req, res);

            expect(userService.verifyPINAndChangePassword).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Password must be at least 8 characters long',
            });
        });

        it('should return 500 when userService.verifyPINAndChangePassword throws an error', async () => {
            req.body = { pin: '123456', newPassword: 'newPassword123' };

            userService.verifyPINAndChangePassword.mockRejectedValue(new Error('Invalid PIN'));

            await UserController.changePassword(req, res);

            expect(userService.verifyPINAndChangePassword).toHaveBeenCalledWith(1, '123456', 'newPassword123');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid PIN',
            });
        });
    });

    describe('updateProfile', () => {
        it('should update profile successfully', async () => {
            req.body = { username: 'newusername' };
            const mockUpdatedUser = {
                id: 1,
                username: 'newusername',
                email: 'test@example.com',
            };

            userService.updateProfile.mockResolvedValue(mockUpdatedUser);

            await UserController.updateProfile(req, res);

            expect(userService.updateProfile).toHaveBeenCalledWith(1, { username: 'newusername' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Profile updated successfully.',
                data: mockUpdatedUser,
            });
        });

        it('should return 400 when username is missing', async () => {
            req.body = {};

            await UserController.updateProfile(req, res);

            expect(userService.updateProfile).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Username is required.',
            });
        });

        it('should return 500 when userService.updateProfile throws an error', async () => {
            req.body = { username: 'newusername' };

            userService.updateProfile.mockRejectedValue(new Error('Update failed'));

            await UserController.updateProfile(req, res);

            expect(userService.updateProfile).toHaveBeenCalledWith(1, { username: 'newusername' });
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Failed to update profile.',
            });
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            req.headers.authorization = 'Bearer mock-jwt-token';
            userService.logout.mockResolvedValue(true);

            await UserController.logout(req, res);

            expect(userService.logout).toHaveBeenCalledWith('mock-jwt-token');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logout successful.',
            });
        });

        it('should return 401 when authorization header is missing', async () => {
            req.headers.authorization = undefined;

            await UserController.logout(req, res);

            expect(userService.logout).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authorization token missing or invalid.',
            });
        });

        it('should return 401 when authorization header is invalid', async () => {
            req.headers.authorization = 'Invalid mock-jwt-token';

            await UserController.logout(req, res);

            expect(userService.logout).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Authorization token missing or invalid.',
            });
        });

        it('should return 401 when token is invalid or expired', async () => {
            req.headers.authorization = 'Bearer mock-jwt-token';
            userService.logout.mockResolvedValue(false);

            await UserController.logout(req, res);

            expect(userService.logout).toHaveBeenCalledWith('mock-jwt-token');
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid or expired token.',
            });
        });

        it('should return 500 when userService.logout throws an error', async () => {
            req.headers.authorization = 'Bearer mock-jwt-token';
            userService.logout.mockRejectedValue(new Error('Logout failed'));

            await UserController.logout(req, res);

            expect(userService.logout).toHaveBeenCalledWith('mock-jwt-token');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error.',
            });
        });
    });

    describe('getPublicKeys', () => {
        it('should get public keys successfully', async () => {
            req.params = { userId: '2' };
            const mockKeys = {
                ik_public: 'ik_public_key',
                spk_public: 'spk_public_key',
                opks_public: ['opk1'],
            };

            userService.getPublicKeys.mockResolvedValue(mockKeys);

            await UserController.getPublicKeys(req, res);

            expect(userService.getPublicKeys).toHaveBeenCalledWith('2');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockKeys,
            });
        });

        it('should return 400 when userId is missing', async () => {
            req.params = {};

            await UserController.getPublicKeys(req, res);

            expect(userService.getPublicKeys).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No user ID provided',
            });
        });

        it('should return 404 when user or keys are not found', async () => {
            req.params = { userId: '2' };
            userService.getPublicKeys.mockResolvedValue(null);

            await UserController.getPublicKeys(req, res);

            expect(userService.getPublicKeys).toHaveBeenCalledWith('2');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found or missing public keys',
            });
        });

        it('should return 500 when userService.getPublicKeys throws an error', async () => {
            req.params = { userId: '2' };
            userService.getPublicKeys.mockRejectedValue(new Error('Fetch failed'));

            await UserController.getPublicKeys(req, res);

            expect(userService.getPublicKeys).toHaveBeenCalledWith('2');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error.',
            });
        });
    });

    describe('getUserIdFromEmail', () => {
        it('should get user ID from email successfully', async () => {
            req.params = { email: 'test@example.com' };
            const mockResponse = { userId: 2 };

            userService.getUserIdFromEmail.mockResolvedValue(mockResponse);

            await UserController.getUserIdFromEmail(req, res);

            expect(userService.getUserIdFromEmail).toHaveBeenCalledWith('test@example.com');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockResponse,
            });
        });

        it('should return 400 when email is missing', async () => {
            req.params = {};

            await UserController.getUserIdFromEmail(req, res);

            expect(userService.getUserIdFromEmail).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'No email provided',
            });
        });

        it('should return 404 when user ID is not found', async () => {
            req.params = { email: 'test@example.com' };
            userService.getUserIdFromEmail.mockResolvedValue(null);

            await UserController.getUserIdFromEmail(req, res);

            expect(userService.getUserIdFromEmail).toHaveBeenCalledWith('test@example.com');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User Id not found',
            });
        });

        it('should return 500 when userService.getUserIdFromEmail throws an error', async () => {
            req.params = { email: 'test@example.com' };
            userService.getUserIdFromEmail.mockRejectedValue(new Error('Fetch failed'));

            await UserController.getUserIdFromEmail(req, res);

            expect(userService.getUserIdFromEmail).toHaveBeenCalledWith('test@example.com');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error.',
            });
        });
    });
});