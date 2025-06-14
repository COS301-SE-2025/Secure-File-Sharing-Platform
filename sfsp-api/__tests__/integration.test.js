/* global describe, it, expect, beforeEach, afterEach, jest */
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

jest.mock('../services/userService');

jest.mock('../config/database', () => {
    const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    return { supabase: mockSupabase };
});

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
                password: 'password123'
            };

            const mockResponse = {
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com'
                },
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            };

            userService.register.mockResolvedValue(mockResponse);

            const response = await request(app)
                .post('/register')
                .send(userData)
                .expect(201);

            expect(response.body).toEqual({
                success: true,
                message: 'User registered successfully.',
                data: mockResponse
            });

            expect(userService.register).toHaveBeenCalledWith(userData);
        });

        it('should return validation error for missing fields', async () => {
            const invalidUserData = {
                username: 'testuser',
                email: 'test@example.com'
            };

            const response = await request(app)
                .post('/register')
                .send(invalidUserData)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Username, email, and password are required.'
            });

            expect(userService.register).not.toHaveBeenCalled();
        });

        it('should handle service errors gracefully', async () => {
            const userData = {
                username: 'testuser',
                email: 'existing@example.com',
                password: 'password123'
            };

            userService.register.mockRejectedValue(new Error('User already exists'));

            const response = await request(app)
                .post('/register')
                .send(userData)
                .expect(500);

            expect(response.body).toEqual({
                success: false,
                message: 'Internal server error.'
            });
        });
    });

    describe('POST /login', () => {
        it('should login user successfully', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const mockResponse = {
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com'
                },
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            };

            userService.login.mockResolvedValue(mockResponse);

            const response = await request(app)
                .post('/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Login successful',
                data: mockResponse
            });

            expect(userService.login).toHaveBeenCalledWith(loginData);
        });

        it('should return validation error for missing credentials', async () => {
            const invalidLoginData = {
                email: 'test@example.com'
            };

            const response = await request(app)
                .post('/login')
                .send(invalidLoginData)
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Email and password are required.'
            });

            expect(userService.login).not.toHaveBeenCalled();
        });

        it('should return 401 for invalid credentials', async () => {
            const invalidLoginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            userService.login.mockRejectedValue(new Error('Invalid password.'));

            const response = await request(app)
                .post('/login')
                .send(invalidLoginData)
                .expect(401);

            expect(response.body).toEqual({
                success: false,
                message: 'Invalid password.'
            });
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
                email: 'test@example.com'
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

            expect(userService.refreshToken).toHaveBeenCalledWith('test@example.com');
        });

        it('should return validation error when email is missing', async () => {
            const response = await request(app)
                .post('/refresh-token')
                .send({})
                .expect(400);

            expect(response.body).toEqual({
                success: false,
                message: 'Email is required.'
            });

            expect(userService.refreshToken).not.toHaveBeenCalled();
        });

        it('should handle service errors gracefully', async () => {
            const requestData = {
                email: 'nonexistent@example.com'
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