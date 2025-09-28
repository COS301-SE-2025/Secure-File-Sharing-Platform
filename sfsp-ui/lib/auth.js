// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';

// /**
//  * Hash a password using bcrypt
//  * @param {string} password
//  * @returns {Promise<string>}
//  */
// export async function hashPassword(password) {
//     const saltRounds = 12;
//     return await bcrypt.hash(password, saltRounds);
// }

// /**
//  * Verify a password against a hash
//  * @param {string} password
//  * @param {string} hash
//  * @returns {Promise<boolean>} 
//  */
// export async function verifyPassword(password, hash) {
//     return await bcrypt.compare(password, hash);
// }

// /**
//  * Generate a secure random password for Google users
//  * @returns {string}
//  */
// export function generateSecurePassword() {
//     const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
//     let password = '';
    
//     for (let i = 0; i < 32; i++) {
//         password += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
    
//     return password;
// }

// /**
//  * Generate a JWT token for authentication
//  * @param {string} userId
//  * @param {string} email
//  * @returns {string}
//  */
// export function generateJWTToken(userId, email) {
//     const JWT_SECRET = "nobody-is-going-to-guess-this-secret";
    
//     return jwt.sign(
//         { userId, email }, 
//         JWT_SECRET, 
//         { expiresIn: "1h" }
//     );
// }
