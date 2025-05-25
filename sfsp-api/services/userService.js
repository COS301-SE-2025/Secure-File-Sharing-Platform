const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {supabase} = require('../config/database');

class UserService {

    generatePIN() {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        let resetPIN = "";
        for (let i = 0; i < 5; i++) {
            resetPIN += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return resetPIN;
    }

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
                    email: newUser.email,
                    resetPasswordPIN: newUser.resetPasswordPIN
                },
                token
            };
        }catch (error) {
            throw new Error('Registration failed: ' + error.message);
        }
            
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



