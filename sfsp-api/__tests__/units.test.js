const UserController = require('../controllers/userController');
const userService = require('../services/userService');

jest.mock('../services/userService');

describe('UserController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: {},
            headers: {}
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
                password: 'password123'
            };

            const mockResult = {
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com'
                },
                token: 'mock-jwt-token'
            };

            userService.register.mockResolvedValue(mockResult);

            await UserController.register(req, res);

            expect(userService.register).toHaveBeenCalledWith({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'User registered successfully.',
                data: mockResult
            });
        });

        it('should return 400 when username is missing', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'password123'
            };

            await UserController.register(req, res);

            expect(userService.register).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Username, email, and password are required.'
            });
        });

        it('should return 400 when email is missing', async () => {
            req.body = {
                username: 'testuser',
                password: 'password123'
            };

            await UserController.register(req, res);

            expect(userService.register).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Username, email, and password are required.'
            });
        });

        it('should return 400 when password is missing', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com'
            };

            await UserController.register(req, res);

            expect(userService.register).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Username, email, and password are required.'
            });
        });

        it('should return 500 when userService.register throws an error', async () => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };

            userService.register.mockRejectedValue(new Error('Registration failed'));

            await UserController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error.'
            });
        });
    });

    describe('login', () => {
        it('should login user successfully', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'password123'
            };

            const mockResult = {
                user: {
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com'
                },
                token: 'mock-jwt-token'
            };

            userService.login.mockResolvedValue(mockResult);

            await UserController.login(req, res);

            expect(userService.login).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123'
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Login successful',
                data: mockResult
            });
        });

        it('should return 400 when email is missing', async () => {
            req.body = {
                password: 'password123'
            };

            await UserController.login(req, res);

            expect(userService.login).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email and password are required.'
            });
        });

        it('should return 400 when password is missing', async () => {
            req.body = {
                email: 'test@example.com'
            };

            await UserController.login(req, res);

            expect(userService.login).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Email and password are required.'
            });
        });

        it('should return 401 when login fails', async () => {
            req.body = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            userService.login.mockRejectedValue(new Error('Invalid password.'));

            await UserController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid password.'
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
});