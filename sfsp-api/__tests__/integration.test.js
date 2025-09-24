/* global describe, it, expect, beforeEach, afterEach, jest */

// Mock VaultController before requiring UserController
jest.doMock('../controllers/vaultController', () => ({
    storeKeyBundle: jest.fn(),
    retrieveKeyBundle: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const UserController = require('../controllers/userController');
const userService = require('../services/userService');

const app = express();
app.use(express.json());

app.post('/register', UserController.register);
app.post('/login', UserController.login);
app.get('/profile', UserController.getProfile);
app.post('/refresh-token', UserController.refreshToken);
app.delete('/profile', UserController.deleteProfile);
app.post('/verify-password', UserController.verifyPassword);
app.post('/send-reset-pin', UserController.sendResetPIN);
app.get('/public-keys/:userId', UserController.getPublicKeys);
app.post('/get-token', UserController.getUserToken);

jest.mock('../services/userService');
const VaultController = require('../controllers/vaultController');

jest.mock('../config/database', () => {
    const mockSupabase = {
        from: jest.fn(() => mockSupabase),
        select: jest.fn(() => mockSupabase),
        eq: jest.fn(() => mockSupabase),
        single: jest.fn(() => ({ data: { email: 'test@example.com', password: 'hashed_password' }, error: null })),
    };
    return { supabase: mockSupabase };
});

jest.mock('../services/userService', () => ({
    register: jest.fn(),
    login: jest.fn(),
    verifyToken: jest.fn(),
    getProfile: jest.fn(),
    refreshToken: jest.fn(),
    deleteProfile: jest.fn(),
    verifyPassword: jest.fn(),
    sendPasswordResetPIN: jest.fn(),
    getPublicKeys: jest.fn(),
    generateToken: jest.fn(),
}));
jest.mock('../utils/mnemonicCrypto', () => ({
    validatePassword: jest.fn(),
}));

describe('UserController Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('POST /register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
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

            const mockResponse = {
                user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                },
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            };

            userService.register.mockResolvedValue(mockResponse);
            VaultController.storeKeyBundle.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/register')
                .send(userData)
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                message: 'User registered successfully.',
                data: mockResponse,
            });

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
        });

        it('should return validation error for missing fields', async () => {
        const invalidUserData = {
            username: 'testuser',
            email: 'test@example.com',
        };

        const response = await request(app)
            .post('/register')
            .send(invalidUserData)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: 'Username, email, and password are required.',
        });

        expect(userService.register).not.toHaveBeenCalled();
        });

        it('should handle service errors gracefully', async () => {
        const userData = {
            username: 'testuser',
            email: 'existing@example.com',
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

        userService.register.mockRejectedValue(new Error('User already exists'));

        const response = await request(app)
            .post('/register')
            .send(userData)
            .expect(409);

        expect(response.body).toEqual({
            success: false,
            message: 'An account with this email address already exists. Please use a different email or try logging in.',
        });

        expect(userService.register).toHaveBeenCalledWith({
            username: 'testuser',
            email: 'existing@example.com',
            password: 'password123',
            ik_public: 'ik_public_key',
            spk_public: 'spk_public_key',
            opks_public: ['opk1', 'opk2'],
            nonce: 'nonce_value',
            signedPrekeySignature: 'signature',
            salt: 'salt_value',
        });
        expect(VaultController.storeKeyBundle).not.toHaveBeenCalled();
        });
    });

    describe('POST /login', () => {
        it('should login user successfully', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123',
            };

            const mockResponse = {
                user: {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                },
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            };

            const mockKeyBundle = {
                ik_private_key: 'ik_private_key',
                spk_private_key: 'spk_private_key',
                opks_private: ['opk_private1'],
            };

            userService.login.mockResolvedValue(mockResponse);
            VaultController.retrieveKeyBundle.mockResolvedValue(mockKeyBundle);

            const response = await request(app)
                .post('/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Login successful',
                data: { ...mockResponse, keyBundle: mockKeyBundle },
            });

            expect(userService.login).toHaveBeenCalledWith(loginData);
            expect(VaultController.retrieveKeyBundle).toHaveBeenCalledWith(1);
        });

        it('should return validation error for missing credentials', async () => {
        const invalidLoginData = {
            email: 'test@example.com',
        };

        const response = await request(app)
            .post('/login')
            .send(invalidLoginData)
            .expect(400);

        expect(response.body).toEqual({
            success: false,
            message: 'Email and password are required.',
        });

        expect(userService.login).not.toHaveBeenCalled();
        });

        it('should return 401 for invalid credentials', async () => {
        const invalidLoginData = {
            email: 'test@example.com',
            password: 'wrongpassword',
        };

        userService.login.mockRejectedValue(new Error('Invalid password.'));

        const response = await request(app)
            .post('/login')
            .send(invalidLoginData)
            .expect(401);

        expect(response.body).toEqual({
            success: false,
            message: 'Invalid password.',
        });

        expect(userService.login).toHaveBeenCalledWith(invalidLoginData);
        });
    });

    describe('GET /profile', () => {
        it('should get user profile successfully with valid token', async () => {
            const mockProfile = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com'
            };

            userService.verifyToken.mockResolvedValue({ userId: 1 });
            userService.getProfile.mockResolvedValue(mockProfile);

            const response = await request(app)
                .get('/profile')
                .set('Authorization', 'Bearer valid-jwt-token')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockProfile
            });

            expect(userService.verifyToken).toHaveBeenCalledWith('valid-jwt-token');
            expect(userService.getProfile).toHaveBeenCalledWith(1);
        });

        it('should return 401 when authorization header is missing', async () => {
            const response = await request(app)
                .get('/profile')
                .expect(401);

            expect(response.body).toEqual({
                success: false,
                message: 'Authorization token missing or invalid.'
            });

            expect(userService.verifyToken).not.toHaveBeenCalled();
        });

        it('should return 401 when token format is invalid', async () => {
            const response = await request(app)
                .get('/profile')
                .set('Authorization', 'Basic invalid-token-format')
                .expect(401);

            expect(response.body).toEqual({
                success: false,
                message: 'Authorization token missing or invalid.'
            });

            expect(userService.verifyToken).not.toHaveBeenCalled();
        });

        it('should return 401 when token is invalid or expired', async () => {
            userService.verifyToken.mockResolvedValue(null);

            const response = await request(app)
                .get('/profile')
                .set('Authorization', 'Bearer expired-token')
                .expect(401);

            expect(response.body).toEqual({
                success: false,
                message: 'Invalid or expired token.'
            });
        });

        it('should return 404 when user profile is not found', async () => {
            userService.verifyToken.mockResolvedValue({ userId: 999 });
            userService.getProfile.mockResolvedValue(null);

            const response = await request(app)
                .get('/profile')
                .set('Authorization', 'Bearer valid-token')
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'User profile not found.'
            });
        });
    });

    describe('POST /refresh-token', () => {
        it('should refresh token successfully', async () => {
            const requestData = {
                  userId: 'user123'
            };

            const mockToken = 'new-jwt-token-12345';
            userService.refreshToken.mockResolvedValue(mockToken);

            const response = await request(app)
                .post('/refresh-token')
                .send(requestData)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Token refreshed successfully.',
                token: mockToken
            });

            expect(userService.refreshToken).toHaveBeenCalledWith('user123');
        });

        it('should return validation error when userID is missing', async () => {
            const response = await request(app)
                .post('/refresh-token')
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'User ID is required.'
            });

            expect(userService.refreshToken).not.toHaveBeenCalled();
        });

        it('should handle service errors gracefully', async () => {
            const requestData = {
                  userId: 'user123' 
            };

            userService.refreshToken.mockRejectedValue(new Error('User not found'));

            const response = await request(app)
                .post('/refresh-token')
                .send(requestData)
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Internal server error.'
            });
        });
    });

    describe('DELETE /profile', () => {
        it('should delete user profile successfully', async () => {
            const requestData = {
                email: 'test@example.com'
            };

            const mockResult = { message: 'Profile deleted successfully.' };
            userService.deleteProfile.mockResolvedValue(mockResult);

            const response = await request(app)
                .delete('/profile')
                .send(requestData)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'User profile deleted successfully.'
            });

            expect(userService.deleteProfile).toHaveBeenCalledWith('test@example.com');
        });

        it('should return validation error when email is missing', async () => {
            const response = await request(app)
                .delete('/profile')
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Email is required.'
            });

            expect(userService.deleteProfile).not.toHaveBeenCalled();
        });

        it('should return 404 when user profile is not found', async () => {
            const requestData = {
                email: 'nonexistent@example.com'
            };

            userService.deleteProfile.mockResolvedValue(null);

            const response = await request(app)
                .delete('/profile')
                .send(requestData)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'User profile not found.'
            });
        });

        it('should handle service errors gracefully', async () => {
            const requestData = {
                email: 'test@example.com'
            };

            userService.deleteProfile.mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .delete('/profile')
                .send(requestData)
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Internal server error.'
            });
        });
    });

    describe('POST /verify-password', () => {
        it('should verify password successfully', async () => {
            const requestData = { currentPassword: 'correctpassword' };

            userService.verifyToken.mockResolvedValue({ userId: 1 });
            userService.getProfile.mockResolvedValue({ id: 1, email: 'test@example.com' });
            const MnemonicCrypto = require('../utils/mnemonicCrypto');
            MnemonicCrypto.validatePassword.mockResolvedValue(true);

            const response = await request(app)
                .post('/verify-password')
                .set('Authorization', 'Bearer valid-token')
                .send(requestData)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Password verified successfully',
            });

            expect(userService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(MnemonicCrypto.validatePassword).toHaveBeenCalledWith('correctpassword', undefined);
        });

        it('should return 400 when current password is missing', async () => {
            userService.verifyToken.mockResolvedValue({ userId: 1 });

            const response = await request(app)
                .post('/verify-password')
                .set('Authorization', 'Bearer valid-token')
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Current password is required',
            });
        });

        it('should return 400 when password is incorrect', async () => {
            const requestData = { currentPassword: 'wrongpassword' };

            userService.verifyToken.mockResolvedValue({ userId: 1 });
            userService.getProfile.mockResolvedValue({ id: 1, email: 'test@example.com' });
            const MnemonicCrypto = require('../utils/mnemonicCrypto');
            MnemonicCrypto.validatePassword.mockResolvedValue(false);

            const response = await request(app)
                .post('/verify-password')
                .set('Authorization', 'Bearer valid-token')
                .send(requestData)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Current password is incorrect',
            });
        });
    });

    describe('POST /send-reset-pin', () => {
        it('should send reset PIN successfully', async () => {
            const mockResult = { message: 'Reset PIN sent successfully' };

            userService.verifyToken.mockResolvedValue({ userId: 1 });
            userService.sendPasswordResetPIN.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/send-reset-pin')
                .set('Authorization', 'Bearer valid-token')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Reset PIN sent successfully',
            });

            expect(userService.verifyToken).toHaveBeenCalledWith('valid-token');
            expect(userService.sendPasswordResetPIN).toHaveBeenCalledWith(1);
        });

        it('should return 401 when token is invalid', async () => {
            userService.verifyToken.mockResolvedValue(null);

            const response = await request(app)
                .post('/send-reset-pin')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body).toEqual({
                success: false,
                message: 'Invalid or expired token.',
            });
        });
    });

    describe('GET /public-keys/:userId', () => {
        it('should get public keys successfully', async () => {
            const mockKeys = {
                ik_public: 'ik_public_key',
                spk_public: 'spk_public_key',
                opks_public: ['opk1', 'opk2']
            };

            userService.getPublicKeys.mockResolvedValue(mockKeys);

            const response = await request(app)
                .get('/public-keys/1')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                data: mockKeys,
            });

            expect(userService.getPublicKeys).toHaveBeenCalledWith('1');
        });

        it('should return 400 when userId is missing', async () => {
            const response = await request(app)
                .get('/public-keys/')
                .expect(404); // Express will return 404 for missing param
        });

        it('should return 404 when user not found', async () => {
            userService.getPublicKeys.mockResolvedValue(null);

            const response = await request(app)
                .get('/public-keys/999')
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'User not found or missing public keys',
            });
        });
    });

    describe('POST /get-token', () => {
        it('should generate token successfully', async () => {
            const requestData = { userId: 1 };
            const mockToken = 'generated-jwt-token';

            userService.generateToken.mockReturnValue(mockToken);

            const response = await request(app)
                .post('/get-token')
                .send(requestData)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                token: mockToken,
            });

            expect(userService.generateToken).toHaveBeenCalledWith(1, 'test@example.com');
        });

        it('should return 400 when userId is missing', async () => {
            const response = await request(app)
                .post('/get-token')
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'User ID is required.',
            });
        });

        it('should return 404 when user not found', async () => {
            const requestData = { userId: 999 };

            // Temporarily mock supabase to return no user
            const originalSingle = require('../config/database').supabase.single;
            require('../config/database').supabase.single.mockResolvedValueOnce({ data: null, error: 'User not found' });

            const response = await request(app)
                .post('/get-token')
                .send(requestData)
                .expect(404);

            expect(response.body).toEqual({
                success: false,
                message: 'User not found.',
            });

            // Restore the mock
            require('../config/database').supabase.single = originalSingle;
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle malformed JSON in request body', async () => {
            const response = await request(app)
                .post('/register')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json"}')
                .expect(400);

            expect(response.status).toBe(400);
        });

        it('should handle empty request body for registration', async () => {
            const response = await request(app)
                .post('/register')
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Username, email, and password are required.'
            });
        });

        it('should handle null values in request body', async () => {
            const requestData = {
                username: null,
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/register')
                .send(requestData)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Username, email, and password are required.'
            });
        });

        it('should handle empty string values in request body', async () => {
            const requestData = {
                username: '',
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/register')
                .send(requestData)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Username, email, and password are required.'
            });
        });
    });
});