const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {supabase} = require('../config/database');

class UserService {
    async register(userData){
        const {username, email, password} = userData;

        try{
            const {data: existinguser} = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (existinguser) {
                throw new Error('User already exists with this email.');
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const resetPasswordPIN = this.generatePIN();

            const {data: newUser, error} = await supabase
                .from('users')
                .insert([{
                    username,
                    email,
                    password: hashedPassword,
                    resetPasswordPIN
                }])
                .select('*')
                .single();

            if (error) {
                throw new Error('Failed to create user: ' + error.message);
            }
            const token = this.generateToken(newUser.id);
           
            return {
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email
                },
                token
            };
        }catch (error) {
            throw new Error('Registration failed: ' + error.message);
        }
            
    }

    async login(userData) {
        const {email, password} = userData;
        try {
            const {data: user, error} = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !user) {
                throw new Error('User not found with this email.');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid password.');
            }

            const token = this.generateToken(user.id);
            return {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                token
            };
        } catch (error) {
            throw new Error('Login failed: ' + error.message);
        }
    }

    async getProfile(email) {
        try {
            const {data: user, error} = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !user) {
                throw new Error('User profile not found.');
            }

            return {
                id: user.id,
                username: user.username,
                email: user.email
            };
        } catch (error) {
            throw new Error('Failed to fetch user profile: ' + error.message);
        }
    }

    async refreshToken(email) {
        try {
            const {data: user, error} = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !user) {
                throw new Error('User not found.');
            }

            const token = this.generateToken(user.id);
            return token;
        } catch (error) {
            throw new Error('Failed to refresh token: ' + error.message);
        }
    }

    async deleteProfile(email) {
        try {
            const {data: user, error} = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !user) {
                throw new Error('User profile not found.');
            }

            const {error: deleteError} = await supabase
                .from('users')
                .delete()
                .eq('email', email);

            if (deleteError) {
                throw new Error('Failed to delete profile: ' + deleteError.message);
            }

            return {message: 'Profile deleted successfully.'};
        } catch (error) {
            throw new Error('Profile deletion failed: ' + error.message);
        }
    }

    generatePIN() {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        let resetPIN = "";
        for (let i = 0; i < 5; i++) {
            resetPIN += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return resetPIN;
    }

    generateToken(userId){
        return jwt.sign({ userId }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }
}

module.exports = new UserService();



