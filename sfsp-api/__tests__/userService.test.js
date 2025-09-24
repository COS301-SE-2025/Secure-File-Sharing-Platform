/* global describe, it, expect, beforeEach, afterEach, jest */
const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('mocked-hash'),
}));

describe('UserService Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.log.mockRestore();
        console.warn.mockRestore();
        console.error.mockRestore();
    });

    describe('generatePIN', () => {
        it('should generate a PIN of length 5', () => {
            const pin = userService.generatePIN();
            expect(pin).toHaveLength(5);
        });

        it('should only contain valid characters', () => {
            const validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
            const pin = userService.generatePIN();

            for (const char of pin) {
                expect(validChars).toContain(char);
            }
        });
    });

    describe('generateToken', () => {
        it('should generate a JWT token with correct payload', () => {
            const mockToken = 'mock-jwt-token';
            jwt.sign.mockReturnValue(mockToken);

            const userId = 1;
            const email = 'test@example.com';
            const token = userService.generateToken(userId, email);

            expect(jwt.sign).toHaveBeenCalledWith(
                { userId, email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            expect(token).toBe(mockToken);
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token successfully', () => {
            const mockPayload = { userId: 1, email: 'test@example.com' };
            jwt.verify.mockReturnValue(mockPayload);

            const token = 'valid-token';
            const result = userService.verifyToken(token);

            expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
            expect(result).toBe(mockPayload);
        });

        it('should throw error for invalid token', () => {
            jwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            const token = 'invalid-token';
            expect(() => userService.verifyToken(token)).toThrow('Invalid token');
        });
    });

    describe('detectBraveBrowser', () => {
        it('should return false for empty headers', () => {
            const result = userService.detectBraveBrowser({});
            expect(result).toBe(false);
        });

        it('should return false for null headers', () => {
            const result = userService.detectBraveBrowser(null);
            expect(result).toBe(false);
        });

        it('should detect Brave from user agent string', () => {
            const headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Brave/91.0.4472.124'
            };
            const result = userService.detectBraveBrowser(headers);
            expect(result).toBe(true);
        });

        it('should detect Brave from sec-ch-ua header', () => {
            const headers = {
                'sec-ch-ua': '"Brave";v="91", "Chromium";v="91"'
            };
            const result = userService.detectBraveBrowser(headers);
            expect(result).toBe(true);
        });

        it('should return false for regular Chrome', () => {
            const headers = {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'sec-ch-ua': '"Google Chrome";v="91", "Chromium";v="91"',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'navigate'
            };
            const result = userService.detectBraveBrowser(headers);
            expect(result).toBe(false);
        });
    });

    describe('generateDeviceFingerprint', () => {
        it('should generate a fingerprint from user agent and IP', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
            const ipAddress = '192.168.1.1';
            const result = userService.generateDeviceFingerprint(userAgent, ipAddress);

            expect(result).toBe('mocked-hash');
            const crypto = require('crypto');
            expect(crypto.createHash).toHaveBeenCalledWith('sha256');
            expect(crypto.update).toHaveBeenCalledWith(`${userAgent}:${ipAddress}`);
            expect(crypto.digest).toHaveBeenCalledWith('hex');
        });

        it('should handle empty user agent', () => {
            const userAgent = '';
            const ipAddress = '192.168.1.1';
            const result = userService.generateDeviceFingerprint(userAgent, ipAddress);

            expect(result).toBe('mocked-hash');
            const crypto = require('crypto');
            expect(crypto.update).toHaveBeenCalledWith(`${userAgent}:${ipAddress}`);
        });

        it('should handle empty IP address', () => {
            const userAgent = 'Mozilla/5.0';
            const ipAddress = '';
            const result = userService.generateDeviceFingerprint(userAgent, ipAddress);

            expect(result).toBe('mocked-hash');
            const crypto = require('crypto');
            expect(crypto.update).toHaveBeenCalledWith(`${userAgent}:${ipAddress}`);
        });
    });

    describe('parseUserAgent', () => {
        it('should return empty object for empty user agent', () => {
            const result = userService.parseUserAgent('');
            expect(result).toEqual({});
        });

        it('should return empty object for null user agent', () => {
            const result = userService.parseUserAgent(null);
            expect(result).toEqual({});
        });

        it('should parse Chrome user agent', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
            const result = userService.parseUserAgent(userAgent);

            expect(result.browserName).toBe('Chrome');
            expect(result.browserVersion).toBe('91.0');
            expect(result.osName).toBe('Windows');
            expect(result.osVersion).toBe('11');
        });

        it('should parse Firefox user agent', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
            const result = userService.parseUserAgent(userAgent);

            expect(result.browserName).toBe('Firefox');
            expect(result.browserVersion).toBe('89.0');
            expect(result.osName).toBe('Windows');
        });

        it('should parse Safari user agent', () => {
            const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15';
            const result = userService.parseUserAgent(userAgent);

            expect(result.browserName).toBe('Safari');
            expect(result.browserVersion).toBe('14.0.3');
            expect(result.osName).toBe('macOS');
        });
    });
});