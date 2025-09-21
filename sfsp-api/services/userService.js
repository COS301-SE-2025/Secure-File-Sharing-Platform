/* global process */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { supabase } = require("../config/database");
const geoip = require('geoip-lite');

class UserService {
  /**
   * Initialize libsodium-wrappers-sumo with robust error handling and fallbacks
   * @returns {Promise<Object>}
   */
  async initializeSodium() {
    try {
      let sodium;

      // This here G, was giving me problems damn
      try {
        sodium = require('libsodium-wrappers-sumo');
        console.log('Sodium initialized via require');
      } catch (requireError) {
        console.warn('Require failed, trying dynamic import:', requireError.message);
        try {
          sodium = (await import('libsodium-wrappers-sumo')).default;
          console.log('Sodium initialized via dynamic import');
        } catch (importError) {
          console.error('Both import methods failed:', importError.message);
          throw new Error('Failed to import libsodium-wrappers-sumo');
        }
      }

      console.log('Waiting for sodium to be ready...');
      await sodium.ready;
      console.log('Sodium is now ready');

      await new Promise(resolve => setTimeout(resolve, 200));

      if (typeof sodium.crypto_pwhash_SALTBYTES === 'undefined') {
        throw new Error('crypto_pwhash_SALTBYTES constant is not available');
      }
      if (typeof sodium.crypto_secretbox_NONCEBYTES === 'undefined') {
        throw new Error('crypto_secretbox_NONCEBYTES constant is not available');
      }
      if (typeof sodium.crypto_sign_keypair !== 'function') {
        throw new Error('crypto_sign_keypair is not a function');
      }

      if (typeof sodium.crypto_pwhash !== 'function') {
        throw new Error('crypto_pwhash is not a function');
      }
      if (typeof sodium.from_base64 !== 'function') {
        throw new Error('from_base64 is not a function');
      }
      if (typeof sodium.crypto_secretbox_easy !== 'function') {
        throw new Error('crypto_secretbox_easy is not a function');
      }
      if (typeof sodium.crypto_secretbox_open_easy !== 'function') {
        throw new Error('crypto_secretbox_open_easy is not a function');
      }

      console.log('Sodium fully initialized and validated');
      return sodium;

    } catch (error) {
      console.error('Failed to initialize sodium:', error.message);
      throw new Error('Sodium initialization failed: ' + error.message);
    }
  }

  async getLocationFromIP(ipAddress) {
    try {
      if (!ipAddress) {
        console.log('No IP address provided for geolocation');
        return 'No IP detected';
      }
      
      console.log('Attempting to geolocate IP:', ipAddress);
      
      const cleanIp = ipAddress.replace(/^::ffff:/, '');
      console.log('Clean IP:', cleanIp);
      
      if (cleanIp === '127.0.0.1' || 
          cleanIp === 'localhost' || 
          cleanIp === '::1' ||
          cleanIp.startsWith('192.168.') || 
          cleanIp.startsWith('10.') || 
          cleanIp.startsWith('172.16.') || 
          cleanIp.startsWith('172.17.') || 
          cleanIp.startsWith('172.18.') || 
          cleanIp.startsWith('172.19.') || 
          cleanIp.startsWith('172.2') || 
          cleanIp.startsWith('172.30.') || 
          cleanIp.startsWith('172.31.')) {
        console.log('Local or internal IP detected:', cleanIp);
        try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          
          if (data && data.city && (data.region || data.country_name)) {
            const location = data.region 
              ? `${data.city}, ${data.region}, ${data.country_name}`
              : `${data.city}, ${data.country_name}`;
            console.log('Retrieved location from external service:', location);
            return location;
          }
        } catch (err) {
          console.log('Failed to get location from external service:', err.message);
        }
        
        return 'Local Network';
      }
      
      if (cleanIp.startsWith('140.') || cleanIp === '140.0.0.0') {
        console.log('South African IP range detected:', cleanIp);
        return 'Pretoria, Gauteng, South Africa';
      }

      if (cleanIp.startsWith('196.') || cleanIp.startsWith('41.') || cleanIp.startsWith('105.')) {
        console.log('South African IP range detected:', cleanIp);
        return 'South Africa (IP-based)';
      }

      const geo = geoip.lookup(cleanIp);
      console.log('Geolocation result:', geo);
      
      if (!geo) {
        if (cleanIp.startsWith('196.')) {
          return 'South Africa (estimated)';
        }
        if (cleanIp.startsWith('41.')) {
          return 'South Africa (estimated)';
        }
        return 'Unknown Location';
      }
      
      if (geo.city && geo.region) {
        return `${geo.city}, ${geo.region}`;
      } else if (geo.city) {
        return `${geo.city}, ${geo.country}`;
      } else if (geo.region) {
        return `${geo.region}, ${geo.country}`;
      } else {
        return geo.country;
      }
    } catch (error) {
      console.error('Error getting location from IP:', error);
      return 'Location Error';
    }
  }

  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        throw new Error("User not found");
      }

      return {
        id: data.id,
        username: data.username,
        email: data.email
      };
    } catch (error) {
      throw new Error("Fetching user by ID failed: " + error.message);
    }
  }

  async register(userData) {
    const {
      username,
      email,
      password,
      ik_public,
      spk_public,
      opks_public,
      nonce,
      signedPrekeySignature,
      salt,
    } = userData;

    try {
      const { data: existinguser } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (existinguser) {
        throw new Error("User already exists with this email.");
      }

      const MnemonicCrypto = require("../utils/mnemonicCrypto");
      const mnemonicWords = MnemonicCrypto.generateMnemonic();

      const encryptionKey = MnemonicCrypto.deriveKeyFromMnemonic(mnemonicWords);

      const encryptedPassword = MnemonicCrypto.encrypt(password, encryptionKey);

      const hashedPassword = await MnemonicCrypto.hashPassword(password);

      const resetPasswordPIN = this.generatePIN();

      const { data: newUser, error } = await supabase
        .from("users")
        .insert([
          {
            username,
            email,
            password: hashedPassword,
            passwordB: encryptedPassword,
            resetPasswordPIN,
            ik_public,
            spk_public,
            opks_public,
            nonce,
            signedPrekeySignature,
            salt,
            is_verified: false,
          },
        ])
        .select("*")
        .single();

      if (error) {
        throw new Error("Failed to create user: " + error.message);
      }
      const token = this.generateToken(newUser.id);

      // Send email with mnemonic words
      try {
        await this.sendMnemonicEmail(newUser.email, newUser.username, mnemonicWords);
        console.log(`Recovery email sent to ${newUser.email} for new user ${newUser.id}`);
      } catch (emailError) {
        console.error(`Failed to send recovery email to ${newUser.email}:`, emailError.message);
        // Don't fail registration if email fails, but log it
      }

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          is_verified: newUser.is_verified,
        },
        token,
        mnemonicWords,
      };
    } catch (error) {
      throw new Error("Registration failed: " + error.message);
    }
  }

  async getUserIdFromEmail(email) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('No rows returned')) {
          return null;
        }
        throw new Error("Database error: " + error.message);
      }

      if (!data) {
        return null;
      }

      const { id } = data;

      return { userId: id };
    } catch (error) {
      console.log('getUserIdFromEmail error:', error.message);
      
      if (error.message.includes("No rows returned") || 
          error.message.includes("PGRST116") ||
          error.code === 'PGRST116') {
        return null;
      }
      
      console.log('Returning null for user existence check due to error:', error.message);
      return null;
    }
  }

  async getUserInfoFromID(userId) {
    try {
      console.log('Attempting to get user info for ID:', userId);
      
      if (!userId) {
        console.log('Invalid userId provided:', userId);
        throw new Error("No user ID provided");
      }
      
      const { data, error } = await supabase
        .from("users")
        .select("username, avatar_url, email")
        .eq("id", userId)
        .single();

      if (error) {
        console.error('Supabase error getting user info:', error);
        throw new Error("This userId was not found");
      }
      
      if (!data) {
        console.log('No user found with ID:', userId);
        throw new Error("This userId was not found");
      }

      console.log('Successfully retrieved user info for ID:', userId);
      return data;
    } catch (error) {
      console.error('Error in getUserInfoFromID:', error);
      throw new Error("Fetching User Info failed: " + error.message);
    }
  }

  async getPublicKeys(userId) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("ik_public, spk_public, opks_public, signedPrekeySignature")
        .eq("id", userId)
        .single();

      if (error || !data) {
        throw new Error("User not found or problem fetching keys");
      }

      const { ik_public, spk_public, opks_public, signedPrekeySignature } =
        data;

      let selectedOpk = null;

      if (opks_public) {
        // ✅ Safely parse JSON string into array
        let opkArray;
        try {
          opkArray = JSON.parse(opks_public);
        } catch (e) {
          throw new Error("OPKs format is invalid JSON");
        }

        // ✅ Select the first available OPK (instead of random to ensure consistency)
        if (Array.isArray(opkArray) && opkArray.length > 0) {
          selectedOpk = opkArray[0]; // Use first OPK instead of random
          console.log("🔍 DEBUG - Selected OPK for sending:", selectedOpk);
        }
      }

      return {
        ik_public,
        spk_public,
        signedPrekeySignature,
        opk: selectedOpk, // ✅ only this single key will be sent
      };
    } catch (error) {
      throw new Error("Fetching User Public keys failed: " + error.message);
    }
  }

  async login(userData) {
    const { email, password } = userData;
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new Error("User not found with this email.");
      }

      const MnemonicCrypto = require("../utils/mnemonicCrypto");
      const isPasswordValid = await MnemonicCrypto.validatePassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid password.");
      }

      const token = this.generateToken(user.id, user.email);
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_verified: user.is_verified,
          ik_public: user.ik_public,
          spk_public: user.spk_public,
          opks_public: user.opks_public,
          nonce: user.nonce,
          signedPrekeySignature: user.signedPrekeySignature,
          salt: user.salt,
          needs_key_reencryption: user.needs_key_reencryption || false,
        },
        token,
      };
    } catch (error) {
      throw new Error("Login failed: " + error.message);
    }
  }

  async getProfile(userId) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !user) {
        throw new Error("User profile not found.");
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        is_google_user: !!user.google_id, // Add flag to indicate if this is a Google user
      };
    } catch (error) {
      throw new Error("Failed to fetch user profile: " + error.message);
    }
  }

  async refreshToken(userId) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !user) {
        throw new Error("User not found.");
      }

      const token = this.generateToken(user.id, user.email);
      return token;
    } catch (error) {
      throw new Error("Failed to refresh token: " + error.message);
    }
  }

  async deleteProfile(email) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new Error("User profile not found.");
      }

      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("email", email);

      if (deleteError) {
        throw new Error("Failed to delete profile: " + deleteError.message);
      }

      return { message: "Profile deleted successfully." };
    } catch (error) {
      throw new Error("Profile deletion failed: " + error.message);
    }
  }

  async updateProfile(userId, updates) {
    const { username } = updates;
    console.log("Attempting to update user with ID:", userId);

    const { data, error } = await supabase
      .from("users")
      .update({ username })
      .eq("id", userId)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase update error:", error);
      throw new Error("Error updating user profile.");
    }

    return {
      id: data.id,
      username: data.username,
      email: data.email,
    };
  }

  generatePIN() {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let resetPIN = "";
    for (let i = 0; i < 5; i++) {
      resetPIN += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return resetPIN;
  }

  generateToken(userId, email) {
    return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid token", error.message);
    }
  }

  async sendPasswordResetPIN(userId) {
    try {
      const resetPIN = this.generatePIN();

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from("users")
        .update({
          resetPasswordPIN: resetPIN,
          resetPINExpiry: expiresAt,
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error("Failed to generate reset PIN");
      }

      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("email, username")
        .eq("id", userId)
        .single();

      if (fetchError || !user) {
        throw new Error("User not found");
      }

      await this.sendResetPINEmail(user.email, user.username, resetPIN);

      return { success: true, message: "Reset PIN sent to your email" };
    } catch (error) {
      throw new Error("Failed to send reset PIN: " + error.message);
    }
  }

  async verifyPINAndChangePassword(userId, pin, newPassword) {
    try {
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("resetPasswordPIN, resetPINExpiry, passwordB")
        .eq("id", userId)
        .single();

      if (fetchError || !user) {
        throw new Error("User not found");
      }

      if (!user.resetPasswordPIN) {
        throw new Error("No reset PIN found. Please request a new one.");
      }

      const now = new Date();
      const expiryTime = new Date(user.resetPINExpiry);

      if (now > expiryTime) {
        await supabase
          .from("users")
          .update({
            resetPasswordPIN: null,
            resetPINExpiry: null,
          })
          .eq("id", userId);

        throw new Error("Reset PIN has expired. Please request a new one.");
      }

      if (String(user.resetPasswordPIN) !== String(pin)) {
        throw new Error("Invalid PIN. Please check your email and try again.");
      }

      // Use Argon2id for password hashing (consistent with registration)
      const MnemonicCrypto = require("../utils/mnemonicCrypto");
      const hashedPassword = await MnemonicCrypto.hashPassword(newPassword);

      // Check if user has passwordB (encrypted password for mnemonic recovery)
      let needsKeyReEncryption = false;
      if (user.passwordB) {
        // If user has passwordB, they have vault keys that need re-encryption
        needsKeyReEncryption = true;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: hashedPassword,
          resetPasswordPIN: null,
          resetPINExpiry: null,
          // Add flag for key re-encryption if needed
          ...(needsKeyReEncryption && { needs_key_reencryption: true }),
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error("Failed to update password");
      }

      return { 
        success: true, 
        message: "Password updated successfully",
        needsKeyReEncryption 
      };
    } catch (error) {
      throw new Error("Failed to change password: " + error.message);
    }
  }

  async sendResetPINEmail(email, username, pin) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset PIN</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
                    <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${username}</strong>,</p>
                    
                    <p style="margin-bottom: 25px;">You requested to change your password. Use the PIN below to verify your identity:</p>
                    
                    <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                        <p style="margin: 0; font-size: 14px; color: #666; margin-bottom: 10px;">Your PIN Code:</p>
                        <p style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px; margin: 0; font-family: 'Courier New', monospace;">${pin}</p>
                    </div>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            ⚠️ <strong>Important:</strong> This PIN will expire in <strong>15 minutes</strong> for security reasons.
                        </p>
                    </div>
                    
                    <p style="margin-bottom: 20px;">If you didn't request this password change, please ignore this email and your password will remain unchanged.</p>
                    
                    <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
                        This is an automated message, please do not reply to this email.
                    </p>
                </div>
            </body>
            </html>
            `;
      const textContent = `
            Hi ${username},

            You requested to change your password. Use this PIN to verify your identity:

            PIN: ${pin}

            This PIN will expire in 15 minutes.

            If you didn't request this, please ignore this email.

            ---
            This is an automated message, please do not reply to this email.
                    `;

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || "Your App Name",
          address: process.env.FROM_EMAIL || process.env.SMTP_USER,
        },
        to: email,
        subject: "Password Reset PIN - Action Required",
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);

      console.log("Password reset PIN email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending password reset PIN email:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  async sendVerificationCode(userId, email, username) {
    try {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
      
      const { error: insertError } = await supabase
        .from("verification_codes")
        .insert({
          user_id: userId,
          code: verificationCode,
          type: 'email_verification',
          expires_at: expiryTime.toISOString(),
          used: false,
        });

      if (insertError) {
        throw new Error("Failed to store verification code: " + insertError.message);
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SecureShare!</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
                    <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${username}</strong>,</p>
                    
                    <p style="margin-bottom: 25px;">Thank you for signing up! Please verify your email address by entering the code below:</p>
                    
                    <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                        <p style="margin: 0; font-size: 14px; color: #666; margin-bottom: 10px;">Your Verification Code:</p>
                        <p style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px; margin: 0; font-family: 'Courier New', monospace;">${verificationCode}</p>
                    </div>
                    
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            ⚠️ <strong>Important:</strong> This code will expire in <strong>15 minutes</strong> for security reasons.
                        </p>
                    </div>
                    
                    <p style="margin-bottom: 20px;">Enter this code on the verification page to complete your account setup and start using SecureShare.</p>
                    
                    <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
                        This is an automated message, please do not reply to this email.
                    </p>
                </div>
            </body>
            </html>
            `;

      const textContent = `
            Hi ${username},

            Thank you for signing up for SecureShare! Please verify your email address by entering the code below:

            Verification Code: ${verificationCode}

            This code will expire in 15 minutes.

            Enter this code on the verification page to complete your account setup.

            ---
            This is an automated message, please do not reply to this email.
                    `;

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || "SecureShare",
          address: process.env.FROM_EMAIL || process.env.SMTP_USER,
        },
        to: email,
        subject: "Verify Your Email - SecureShare",
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);

      console.log("Verification email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email: " + error.message);
    }
  }

  /**
   * Send mnemonic words to user via email for password recovery
   * @param {string} email 
   * @param {string} username
   * @param {string[]} mnemonicWords
   */
  async sendMnemonicEmail(email, username, mnemonicWords) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const numberedWords = mnemonicWords.map((word, index) =>
        `${index + 1}. ${word}`
      ).join('\n');

      const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Recovery Mnemonic</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Your Recovery Mnemonic</h1>
                </div>

                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
                    <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${username}</strong>,</p>

                    <p style="margin-bottom: 25px;">Your SecureShare account has been created successfully! Here are your recovery words:</p>

                    <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                        <p style="margin: 0; font-size: 14px; color: #666; margin-bottom: 15px;">Your Recovery Mnemonic (Save These Words):</p>
                        <pre style="font-size: 16px; font-weight: bold; color: #333; margin: 0; font-family: 'Courier New', monospace; white-space: pre-line; text-align: left;">${numberedWords}</pre>
                    </div>

                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #721c24; font-size: 14px;">
                            🔐 <strong>CRITICAL SECURITY WARNING:</strong>
                        </p>
                        <ul style="margin: 10px 0; padding-left: 20px; color: #721c24;">
                            <li>Store these words in a safe, secure location</li>
                            <li>Never share them with anyone</li>
                            <li>Write them down on paper or save in an encrypted password manager</li>
                            <li><strong>We cannot recover or resend these words if you lose them</strong></li>
                        </ul>
                    </div>

                    <p style="margin-bottom: 20px;">These words allow you to recover your account if you forget your password. Keep them secure!</p>

                    <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">

                    <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
                        This is an automated message from SecureShare. Please do not reply to this email.
                    </p>
                </div>
            </body>
            </html>
            `;

      const textContent = `
            Hi ${username},

            Your SecureShare account has been created successfully!

            YOUR RECOVERY MNEMONIC (SAVE THESE WORDS):

            ${numberedWords}

            CRITICAL SECURITY WARNING:
            - Store these words in a safe, secure location
            - Never share them with anyone
            - Write them down on paper or save in an encrypted password manager
            - WE CANNOT RECOVER OR RESEND THESE WORDS IF YOU LOSE THEM

            These words allow you to recover your account if you forget your password.

            ---
            This is an automated message from SecureShare. Please do not reply to this email.
                    `;

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || "SecureShare",
          address: process.env.FROM_EMAIL || process.env.SMTP_USER,
        },
        to: email,
        subject: "Your Recovery Mnemonic (Save These Words)",
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);

      console.log("Mnemonic email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending mnemonic email:", error);
      throw new Error("Failed to send mnemonic email: " + error.message);
    }
  }

  getDecodedToken(token) {
    try {
      const decoded = this.verifyToken(token);
      return {
        valid: true,
        decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async logout(token) {
    try {
      this.verifyToken(token);

      return true;
    } catch (error) {
      return false;
    }
  }

  async updateNotificationSettings(userId, notificationSettings) {
    try {
      if (!notificationSettings || typeof notificationSettings !== 'object') {
        throw new Error('Invalid notification settings');
      }

      const expectedKeys = {
        alerts: [
          'runningOutOfSpace',
          'deleteLargeFiles',
          'newBrowserSignIn',
          'newDeviceLinked',
          'newAppConnected',
        ],
        files: ['sharedFolderActivity'],
        news: ['newFeatures', 'secureShareTips', 'feedbackSurveys'],
      };

      for (const [category, settings] of Object.entries(expectedKeys)) {
        if (!notificationSettings[category]) {
          throw new Error(`Missing ${category} in notification settings`);
        }
        for (const key of settings) {
          if (!(key in notificationSettings[category])) {
            throw new Error(`Missing ${key} in ${category}`);
          }
          if (typeof notificationSettings[category][key] !== 'boolean') {
            throw new Error(`${key} in ${category} must be a boolean`);
          }
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update({ notification_settings: notificationSettings })
        .eq('id', userId)
        .select('notification_settings')
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (!data) {
        throw new Error('User not found');
      }

      return data.notification_settings;
    } catch (error) {
      throw new Error(`Failed to update notification settings: ${error.message}`);
    }
  }

  async getNotificationSettings(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('notification_settings, email, username')
        .eq('id', userId)
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (!data) {
        throw new Error('User not found');
      }

      return {
        notificationSettings: data.notification_settings,
        email: data.email,
        username: data.username,
      };
    } catch (error) {
      throw new Error(`Failed to fetch notification settings: ${error.message}`);
    }
  }

  async shouldSendEmail(userId, notificationType, category) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('notification_settings')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.notification_settings[category]?.[notificationType] || false;
    } catch (error) {
      return false;
    }
  }

  // Email notification functions
  async sendStorageAlertEmail(userId, email, username, usedSpace, totalSpace) {
    const shouldSend = await this.shouldSendEmail(userId, 'runningOutOfSpace', 'alerts');
    if (!shouldSend) return;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const usedPercentage = ((usedSpace / totalSpace) * 100).toFixed(1);
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'SecureShare - Storage Alert: Running Low on Space',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">SecureShare - Storage Alert</h2>
          
          <p>Hello ${username},</p>
          
          <p><strong>You're running low on storage space!</strong></p>
          
          <div style="background-color: #fef2f2; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc2626;">
            <p style="margin: 0;"><strong>Current Usage:</strong> ${usedPercentage}% (${(usedSpace / (1024 * 1024 * 1024)).toFixed(2)} GB of ${(totalSpace / (1024 * 1024 * 1024)).toFixed(2)} GB)</p>
          </div>
          
          <p>To free up space, you can:</p>
          <ul>
            <li>Delete unnecessary files</li>
            <li>Move files to external storage</li>
            <li>Upgrade your storage plan</li>
          </ul>
          
          <p>Visit your <a href="${process.env.FRONTEND_URL}/dashboard/myFilesV2" style="color: #2563eb;">dashboard</a> to manage your files.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. You can manage your notification preferences in your account settings.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Storage alert email sent to:', email);
    } catch (error) {
      console.error('Failed to send storage alert email:', error);
    }
  }

  async sendLargeFileDeletionEmail(userId, email, username, deletedFilesCount, totalSizeDeleted) {
    const shouldSend = await this.shouldSendEmail(userId, 'deleteLargeFiles', 'alerts');
    if (!shouldSend) return;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'SecureShare - Large File Deletion Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">SecureShare - File Deletion Alert</h2>
          
          <p>Hello ${username},</p>
          
          <p>We noticed you recently deleted a large number of files from your account.</p>
          
          <div style="background-color: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>Deletion Summary:</strong></p>
            <ul style="margin: 10px 0 0 20px;">
              <li>Files deleted: ${deletedFilesCount}</li>
              <li>Total size: ${(totalSizeDeleted / (1024 * 1024 * 1024)).toFixed(2)} GB</li>
            </ul>
          </div>
          
          <p>If this was not you, please:</p>
          <ul>
            <li>Change your password immediately</li>
            <li>Review your recent activity logs</li>
            <li>Contact our support team</li>
          </ul>
          
          <p>Check your <a href="${process.env.FRONTEND_URL}/dashboard/trash" style="color: #2563eb;">trash</a> to restore any accidentally deleted files.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. You can manage your notification preferences in your account settings.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Large file deletion alert email sent to:', email);
    } catch (error) {
      console.error('Failed to send large file deletion alert email:', error);
    }
  }

  async sendNewBrowserSignInEmail(userId, email, username, browserInfo, location, ipAddress) {
    const shouldSend = await this.shouldSendEmail(userId, 'newBrowserSignIn', 'alerts');
    if (!shouldSend) return;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'SecureShare - New Browser Sign-In Detected',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">SecureShare - New Sign-In Alert</h2>
          
          <p>Hello ${username},</p>
          
          <p>We detected a new sign-in to your SecureShare account from a different browser.</p>
          
          <div style="background-color: #f3e8ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #7c3aed;">
            <p style="margin: 0;"><strong>Sign-in Details:</strong></p>
            <ul style="margin: 10px 0 0 20px;">
              <li>Browser: ${browserInfo || 'Unknown'}</li>
              <li>Location: ${location || 'Unknown'}</li>
              <li>IP Address: ${ipAddress || 'Unknown'}</li>
              <li>Time: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p><strong>If this was you:</strong> No action is needed.</p>
          <p><strong>If this wasn't you:</strong> Please change your password immediately and review your account security.</p>
          
          <p>You can view your recent activity in your <a href="${process.env.FRONTEND_URL}/dashboard/accessLogs" style="color: #2563eb;">access logs</a>.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. You can manage your notification preferences in your account settings.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('New browser sign-in alert email sent to:', email);
    } catch (error) {
      console.error('Failed to send new browser sign-in alert email:', error);
    }
  }

  async sendNewDeviceLinkedEmail(userId, email, username, deviceInfo, deviceType) {
    const shouldSend = await this.shouldSendEmail(userId, 'newDeviceLinked', 'alerts');
    if (!shouldSend) return;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'SecureShare - New Device Linked',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">SecureShare - New Device Linked</h2>
          
          <p>Hello ${username},</p>
          
          <p>A new device has been linked to your SecureShare account.</p>
          
          <div style="background-color: #ecfdf5; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #059669;">
            <p style="margin: 0;"><strong>Device Details:</strong></p>
            <ul style="margin: 10px 0 0 20px;">
              <li>Device: ${deviceInfo || 'Unknown device'}</li>
              <li>Type: ${deviceType || 'Unknown'}</li>
              <li>Linked: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p>If you didn't authorize this device linking, please:</p>
          <ul>
            <li>Remove the device from your account settings</li>
            <li>Change your password</li>
            <li>Contact our support team</li>
          </ul>
          
          <p>Manage your devices in your <a href="${process.env.FRONTEND_URL}/dashboard/settings" style="color: #2563eb;">account settings</a>.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. You can manage your notification preferences in your account settings.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('New device linked alert email sent to:', email);
    } catch (error) {
      console.error('Failed to send new device linked alert email:', error);
    }
  }

  async sendNewAppConnectedEmail(userId, email, username, appName, permissions) {
    const shouldSend = await this.shouldSendEmail(userId, 'newAppConnected', 'alerts');
    if (!shouldSend) return;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'SecureShare - New App Connected',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">SecureShare - New App Connected</h2>
          
          <p>Hello ${username},</p>
          
          <p>A new application has been connected to your SecureShare account.</p>
          
          <div style="background-color: #ecfeff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #0891b2;">
            <p style="margin: 0;"><strong>App Details:</strong></p>
            <ul style="margin: 10px 0 0 20px;">
              <li>Application: ${appName || 'Unknown app'}</li>
              <li>Permissions: ${permissions || 'Standard access'}</li>
              <li>Connected: ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p>If you didn't authorize this app connection, please:</p>
          <ul>
            <li>Revoke the app's access immediately</li>
            <li>Change your password</li>
            <li>Review your connected apps</li>
          </ul>
          
          <p>Manage your connected apps in your <a href="${process.env.FRONTEND_URL}/dashboard/settings" style="color: #2563eb;">account settings</a>.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. You can manage your notification preferences in your account settings.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('New app connected alert email sent to:', email);
    } catch (error) {
      console.error('Failed to send new app connected alert email:', error);
    }
  }

  async sendWeeklySharedFolderDigest(userId, email, username, activities) {
    const shouldSend = await this.shouldSendEmail(userId, 'sharedFolderActivity', 'files');
    if (!shouldSend) return;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Group activities by folder
    const folderActivities = {};
    activities.forEach(activity => {
      const folder = activity.folderName || 'General';
      if (!folderActivities[folder]) {
        folderActivities[folder] = [];
      }
      folderActivities[folder].push(activity);
    });

    const activitySummary = Object.entries(folderActivities)
      .map(([folder, acts]) => `<li><strong>${folder}:</strong> ${acts.length} activities</li>`)
      .join('');

    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'SecureShare - Weekly Shared Folder Activity Digest',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SecureShare - Weekly Activity Digest</h2>
          
          <p>Hello ${username},</p>
          
          <p>Here's your weekly summary of activity in your shared folders:</p>
          
          <div style="background-color: #eff6ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1e40af;">Activity Summary</h3>
            <ul style="margin: 10px 0 0 20px;">
              ${activitySummary}
            </ul>
          </div>
          
          <h3>Recent Activities:</h3>
          <div style="background-color: #f9fafb; padding: 15px; margin: 20px 0; border-radius: 8px;">
            ${activities.slice(0, 10).map(activity => `
              <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">
                <p style="margin: 0;"><strong>${activity.user}:</strong> ${activity.action} <em>${activity.fileName}</em></p>
                <small style="color: #6b7280;">${new Date(activity.timestamp).toLocaleString()}</small>
              </div>
            `).join('')}
          </div>
          
          <p>View detailed activity logs in your <a href="${process.env.FRONTEND_URL}/dashboard/accessLogs" style="color: #2563eb;">access logs</a>.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. You can manage your notification preferences in your account settings.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Weekly shared folder digest email sent to:', email);
    } catch (error) {
      console.error('Failed to send weekly shared folder digest email:', error);
    }
  }

  async updateAvatarUrl(userId, avatarUrl) {
    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select('avatar_url')
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('User not found');

    return data.avatar_url;
  }

  // Device tracking and session management methods
  async createOrUpdateUserSession(userId, deviceInfo) {
    console.log('Creating/updating session for user:', userId);
    console.log('Device info provided:', {
      browserName: deviceInfo.browserName,
      browserVersion: deviceInfo.browserVersion,
      osName: deviceInfo.osName,
      osVersion: deviceInfo.osVersion,
      deviceType: deviceInfo.deviceType,
      isMobile: deviceInfo.isMobile,
      isTablet: deviceInfo.isTablet,
      isDesktop: deviceInfo.isDesktop,
      fingerprintPrefix: deviceInfo.deviceFingerprint?.substring(0, 10) + '...',
      ipAddressPartial: deviceInfo.ipAddress?.substring(0, 7) + '...',
      userAgentPartial: deviceInfo.userAgent?.substring(0, 30) + '...'
    });
    const {
      deviceFingerprint,
      userAgent,
      ipAddress,
      browserName,
      browserVersion,
      osName,
      osVersion,
      deviceType,
      isMobile,
      isTablet,
      isDesktop
    } = deviceInfo;

    // Get location from IP address
    const location = await this.getLocationFromIP(ipAddress);
    
    try {
      // Check if session already exists
      const { data: existingSession, error: fetchError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw fetchError;
      }

      if (existingSession) {
        const updateData = {
          last_login_at: new Date().toISOString(),
          login_count: existingSession.login_count + 1,
          is_active: true
        };
        
        updateData.browser_name = browserName;
        updateData.browser_version = browserVersion;
        updateData.os_name = osName;
        updateData.os_version = osVersion;
        updateData.device_type = deviceType;
        updateData.is_mobile = isMobile;
        updateData.is_tablet = isTablet;
        updateData.is_desktop = isDesktop;
        
        if (ipAddress && existingSession.ip_address !== ipAddress) {
          updateData.ip_address = ipAddress;
          updateData.location = location;
        }
        
        const { data, error } = await supabase
          .from('user_sessions')
          .update(updateData)
          .eq('id', existingSession.id)
          .select()
          .single();

        if (error) throw error;
        return { session: data, isNewDevice: false };
      } else {
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: userId,
            device_fingerprint: deviceFingerprint,
            user_agent: userAgent,
            ip_address: ipAddress,
            location: location,
            browser_name: browserName,
            browser_version: browserVersion,
            os_name: osName,
            os_version: osVersion,
            device_type: deviceType,
            is_mobile: isMobile,
            is_tablet: isTablet,
            is_desktop: isDesktop
          })
          .select()
          .single();

        if (error) throw error;
        return { session: data, isNewDevice: true };
      }
    } catch (error) {
      console.error('Error creating/updating user session:', error);
      throw new Error('Failed to track user session: ' + error.message);
    }
  }

  async getUserSessions(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required but was undefined or null');
      }
      
      console.log('Fetching sessions for user ID:', userId);
      
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_login_at', { ascending: false });

      if (error) throw error;
      
      console.log('Raw sessions from database:', data?.map(s => ({
        id: s.id,
        browser: s.browser_name,
        ip: s.ip_address,
        location: s.location,
        last_login: s.last_login_at,
        fingerprint: s.device_fingerprint?.substring(0, 16) + '...'
      })));
      
      // Update locations for sessions with missing or unknown locations
      const updatedSessions = await this.updateSessionLocations(data);
      
      console.log('Final sessions to return:', updatedSessions?.map(s => ({
        id: s.id,
        browser: s.browser_name,
        ip: s.ip_address,
        location: s.location,
        last_login: s.last_login_at
      })));
      
      return updatedSessions || [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw new Error('Failed to fetch user sessions: ' + error.message);
    }
  }
  
  // Helper method to update locations for sessions with IPs but no location
  async updateSessionLocations(sessions) {
    if (!sessions || sessions.length === 0) return sessions;
    
    console.log('Updating locations for', sessions.length, 'sessions');
    
    const updatedSessions = [...sessions];
    const sessionsToUpdate = [];
    
    // Find sessions that have IP addresses but no location or "Unknown Location"
    for (let i = 0; i < updatedSessions.length; i++) {
      const session = updatedSessions[i];
      console.log(`Processing session ${i + 1}/${updatedSessions.length}: ID=${session.id}, IP=${session.ip_address}, location=${session.location}`);
      
      // Always update South African IPs with 140.x.x.x pattern OR sessions with old/incorrect locations
      if (session.ip_address && (
          !session.location || 
          session.location === 'Unknown Location' || 
          session.location === 'unknown' ||
          session.location === 'Local Network' ||
          session.location === 'Local Development Environment' ||
          session.location === 'Location Error' ||
          (session.ip_address.startsWith('140.') && session.location !== 'Pretoria, Gauteng, South Africa')
      )) {
        console.log(`Re-calculating location for session ${session.id} with IP ${session.ip_address}`);
        const location = await this.getLocationFromIP(session.ip_address);
        console.log(`New location determined: ${location}`);
        
        updatedSessions[i].location = location;
        
        // Add to batch update if location was determined
        if (location) {
          sessionsToUpdate.push({
            id: session.id,
            location: location
          });
        }
      } else {
        console.log(`Skipping location update for session ${session.id} - condition not met`);
      }
    }
    
    // Batch update sessions in database if any need updating
    if (sessionsToUpdate.length > 0) {
      try {
        console.log(`Updating ${sessionsToUpdate.length} sessions in database`);
        // Update each session in database
        for (const sessionUpdate of sessionsToUpdate) {
          const { error } = await supabase
            .from('user_sessions')
            .update({ location: sessionUpdate.location })
            .eq('id', sessionUpdate.id);
            
          if (error) {
            console.error(`Error updating session ${sessionUpdate.id}:`, error);
          }
        }
        console.log(`Updated locations for ${sessionsToUpdate.length} sessions`);
      } catch (error) {
        console.error('Error updating session locations:', error);
      }
    }
    
    return updatedSessions;
  }

  async deactivateUserSession(sessionId, userId) {
    try {
      // Check if sessionId and userId are valid
      if (!sessionId) {
        throw new Error('Session ID is required but was undefined or null');
      }

      if (!userId) {
        throw new Error('User ID is required but was undefined or null');
      }

      console.log('Deleting session ID:', sessionId, 'for user ID:', userId);

      const { data, error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting user session:', error);
      throw new Error('Failed to delete session: ' + error.message);
    }
  }

  async updateSessionBrowserInfo(userId, deviceFingerprint, browserInfo) {
    try {
      console.log('Updating browser info for session:', deviceFingerprint);
      const { error } = await supabase
        .from('user_sessions')
        .update({
          browser_name: browserInfo.browserName,
          browser_version: browserInfo.browserVersion,
          os_name: browserInfo.osName,
          os_version: browserInfo.osVersion,
          device_type: browserInfo.deviceType,
          is_mobile: browserInfo.isMobile,
          is_tablet: browserInfo.isTablet,
          is_desktop: browserInfo.isDesktop
        })
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint);

      if (error) throw error;
      console.log('Successfully updated browser info for session');
    } catch (error) {
      console.error('Error updating session browser info:', error);
      throw error;
    }
  }

  async updateSessionLastLogin(userId, deviceFingerprint) {
    try {
      console.log('Updating last login for user:', userId, 'with fingerprint:', deviceFingerprint);
      
      // First try to update by exact fingerprint match
      let { error } = await supabase
        .from('user_sessions')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint);

      if (error) {
        console.log('Exact fingerprint match failed, trying alternative approach');
        
        // If exact match fails, update the most recent active session for this user
        // This handles cases where IP addresses might differ between login and session fetch
        const { error: altError } = await supabase
          .from('user_sessions')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('last_login_at', { ascending: false })
          .limit(1);

        if (altError) {
          console.error('Alternative update also failed:', altError);
          throw altError;
        }
        console.log('Successfully updated last login timestamp using alternative method');
      } else {
        console.log('Successfully updated last login timestamp with exact match');
      }
    } catch (error) {
      console.error('Error updating session last login:', error);
      throw error;
    }
  }

  // Check if the browser is Brave based on headers
  detectBraveBrowser(headers) {
    // If headers are empty or not provided, can't detect Brave
    if (!headers || Object.keys(headers).length === 0) {
      console.log('No headers provided for Brave detection');
      return false;
    }

    // If headers are passed in deviceInfo object, extract them
    if (headers && headers.headers) {
      headers = headers.headers;
    }
    
    // List of headers that can help identify Brave
    const braveIndicators = [
      'sec-ch-ua-full-version-list', // Brave includes this header
      'sec-ch-ua-platform-version',  // Brave specific header
      'x-client-data',               // Chromium-based metadata
      'sec-fetch-site',              // Modern browsers like Brave use these fetch metadata headers
      'sec-fetch-mode',
      'sec-fetch-dest'
    ];
    
    // Log all headers for debugging
    console.log('Checking headers for Brave detection:');
    Object.keys(headers).forEach(header => {
      console.log(`${header}: ${headers[header]}`);
    });
    
    // Look for 'brave' in any header value
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string' && value.toLowerCase().includes('brave')) {
        console.log(`Found 'brave' in header ${key}: ${value}`);
        return true;
      }
    }
    
    // Check for Brave's unique patterns in sec-ch-ua
    if (headers['sec-ch-ua']) {
      const ua = headers['sec-ch-ua'].toLowerCase();
      if (ua.includes('brave') || (ua.includes('chrome') && !ua.includes('google chrome'))) {
        console.log('Detected Brave from sec-ch-ua pattern:', ua);
        return true;
      }
    }
    
    // Check if most Brave-specific headers are present
    let braveHeadersCount = 0;
    braveIndicators.forEach(header => {
      if (headers[header]) {
        braveHeadersCount++;
      }
    });
    
    // If browser has "Chrome" in UA and has most of the Brave-specific headers
    if (braveHeadersCount >= 4) {
      console.log(`Detected ${braveHeadersCount} Brave-like headers`);
      
      // Additional check for specific combinations
      if (headers['sec-ch-ua'] && headers['sec-fetch-site'] && headers['sec-fetch-mode']) {
        if (!headers['x-requested-with']) { // Brave typically doesn't send this header
          console.log('Header pattern matches Brave');
          return true;
        }
      }
    }
    
    // Examine user-agent string for Brave hints
    if (headers['user-agent']) {
      const ua = headers['user-agent'].toLowerCase();
      
      // Check for Brave/Chrome patterns without "Google Chrome"
      if (ua.includes('chrome/') && !ua.includes('google chrome') && 
          (ua.includes('safari/') && !ua.includes('edg') && !ua.includes('opr'))) {
        console.log('User agent pattern suggests Brave (Chrome without identifiers)');
        // Additional verification - this is a heuristic approach
        if (headers['sec-ch-ua'] && headers['sec-ch-ua'].includes('Chrome')) {
          console.log('Additional verification from sec-ch-ua supports Brave detection');
          return true;
        }
      }
    }
    
    console.log('Not detected as Brave browser');
    return false;
  }

  parseUserAgent(userAgent, headers = {}) {
    if (!userAgent) return {};

    // If headers are passed in deviceInfo object, extract them
    if (headers && headers.headers) {
      headers = headers.headers;
    }

    const ua = userAgent.toLowerCase();
    console.log('Parsing user agent:', ua);
    
    // Log headers for debugging browser detection
    if (headers && Object.keys(headers).length > 0) {
      console.log('Headers available for browser detection:');
      ['user-agent', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'sec-fetch-site', 'sec-fetch-mode'].forEach(header => {
        if (headers[header]) {
          console.log(`  ${header}: ${headers[header]}`);
        }
      });
    }

    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    // First check for Brave using request headers - most reliable method
    if (this.detectBraveBrowser(headers)) {
      browserName = 'Brave';
      console.log('Detected Brave browser from request headers');
      const match = ua.match(/chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // Explicit Brave in user agent string
    else if (ua.includes('brave')) {
      browserName = 'Brave';
      console.log('Detected Brave browser from explicit mention in UA');
      const match = ua.match(/chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } 
    // Edge detection (both Chromium and Legacy Edge)
    else if (ua.includes('edg/') || ua.includes('edge/')) {
      browserName = 'Edge';
      console.log('Detected Edge browser');
      let match = ua.match(/edg(?:e)?\/([\d.]+)/);
      if (!match) {
        match = ua.match(/edge\/([\d.]+)/);
      }
      browserVersion = match ? match[1] : 'Unknown';
    } 
    // Opera detection (including Opera Mini)
    else if (ua.includes('opr/') || ua.includes('opera/')) {
      browserName = 'Opera';
      console.log('Detected Opera browser');
      let match = ua.match(/opr\/([\d.]+)/);
      if (!match) {
        match = ua.match(/opera\/([\d.]+)/);
      }
      browserVersion = match ? match[1] : 'Unknown';
    } 
    // Opera Mini has a different user agent structure
    else if (ua.includes('opera mini')) {
      browserName = 'Opera Mini';
      console.log('Detected Opera Mini browser');
      const match = ua.match(/opera mini\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } 
    // Vivaldi browser detection
    else if (ua.includes('vivaldi')) {
      browserName = 'Vivaldi';
      console.log('Detected Vivaldi browser');
      const match = ua.match(/vivaldi\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } 
    // Yandex Browser detection
    else if (ua.includes('yabrowser')) {
      browserName = 'Yandex';
      console.log('Detected Yandex Browser');
      const match = ua.match(/yabrowser\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // UC Browser detection
    else if (ua.includes('ucbrowser') || ua.includes('uc browser')) {
      browserName = 'UC Browser';
      console.log('Detected UC Browser');
      const match = ua.match(/ucbrowser\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // Samsung Internet Browser detection
    else if (ua.includes('samsungbrowser')) {
      browserName = 'Samsung Internet';
      console.log('Detected Samsung Internet browser');
      const match = ua.match(/samsungbrowser\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // Firefox detection
    else if (ua.includes('firefox/')) {
      browserName = 'Firefox';
      console.log('Detected Firefox browser');
      const match = ua.match(/firefox\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // Safari detection (must come after Chrome since Chrome also includes Safari in UA)
    else if (ua.includes('safari/') && !ua.includes('chrome/')) {
      browserName = 'Safari';
      console.log('Detected Safari browser');
      const match = ua.match(/version\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // Chrome detection (must come after all other Chromium browsers)
    else if (ua.includes('chrome/')) {
      // Chrome for iOS detection
      if (ua.includes('crios/')) {
        browserName = 'Chrome iOS';
        console.log('Detected Chrome for iOS');
        const match = ua.match(/crios\/([\d.]+)/);
        browserVersion = match ? match[1] : 'Unknown';
      } 
      // Chrome on Android
      else if (ua.includes('chrome/') && ua.includes('android')) {
        browserName = 'Chrome Android';
        console.log('Detected Chrome for Android');
        const match = ua.match(/chrome\/([\d.]+)/);
        browserVersion = match ? match[1] : 'Unknown';
      }
      // Generic Chrome detection
      else {
        browserName = 'Chrome';
        console.log('Detected Chrome browser');
        const match = ua.match(/chrome\/([\d.]+)/);
        browserVersion = match ? match[1] : 'Unknown';
      }
    }
    // Generic Mozilla detection as fallback
    else if (ua.includes('mozilla/')) {
      browserName = 'Mozilla-based';
      console.log('Detected generic Mozilla-based browser');
      const match = ua.match(/rv:([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    // OS detection
    let osName = 'Unknown';
    let osVersion = 'Unknown';

    // Check sec-ch-ua-platform header for more accurate OS detection first
    if (headers && headers['sec-ch-ua-platform']) {
      // Remove quotes from the platform value
      const platform = headers['sec-ch-ua-platform'].replace(/"/g, '').toLowerCase();
      console.log('Platform from sec-ch-ua-platform:', platform);
      
      if (platform.includes('windows')) {
        osName = 'Windows';
        // Try to get version from platform-version
        if (headers['sec-ch-ua-platform-version']) {
          const versionMatch = headers['sec-ch-ua-platform-version'].match(/"([^"]+)"/);
          if (versionMatch) {
            const versionNumber = parseFloat(versionMatch[1]);
            // Windows 11 reports as 10.0 but with higher build numbers
            if (versionNumber >= 10) {
              const fullVersion = versionMatch[1];
              // Windows 11 typically has build number 22000 or higher
              if (fullVersion.includes('.22') || parseInt(fullVersion.split('.')[2]) >= 22000) {
                osVersion = '11';
              } else {
                osVersion = '10';
              }
            }
          }
        }
      } else if (platform.includes('mac')) {
        osName = 'macOS';
        // Try to get version from platform-version
        if (headers['sec-ch-ua-platform-version']) {
          const versionMatch = headers['sec-ch-ua-platform-version'].match(/"([^"]+)"/);
          if (versionMatch) {
            osVersion = versionMatch[1];
          }
        }
      } else if (platform.includes('linux')) {
        osName = 'Linux';
      } else if (platform.includes('android')) {
        osName = 'Android';
        // Try to get version from platform-version
        if (headers['sec-ch-ua-platform-version']) {
          const versionMatch = headers['sec-ch-ua-platform-version'].match(/"([^"]+)"/);
          if (versionMatch) {
            osVersion = versionMatch[1];
          }
        }
      } else if (platform.includes('ios')) {
        osName = 'iOS';
        // Try to get version from platform-version
        if (headers['sec-ch-ua-platform-version']) {
          const versionMatch = headers['sec-ch-ua-platform-version'].match(/"([^"]+)"/);
          if (versionMatch) {
            osVersion = versionMatch[1];
          }
        }
      } else {
        osName = platform.charAt(0).toUpperCase() + platform.slice(1); // Capitalize the platform name
      }
    }
    
    // Fallback to user agent string if we couldn't determine OS from headers
    if (osName === 'Unknown') {
      if (ua.includes('windows')) {
        // Windows version detection
        const ntMatch = ua.match(/windows nt ([\d.]+)/);
        const ntVersion = ntMatch ? ntMatch[1] : 'Unknown';
        
        // Check for Windows 11
        // Windows 11 reports as NT 10.0 but we can check for newer build numbers
        // or other indicators like "Windows NT 10.0; Win64; x64"
        if (ntVersion === '10.0') {
          // Check if it's likely Windows 11 based on additional signals
          // Windows 11 typically has newer build numbers
          if (ua.includes('windows nt 10.0; win64') && 
              (ua.includes('rv:') || ua.includes('webkit') || 
              parseFloat(browserVersion) >= 90)) { // Many browsers are at v90+ when Win11 launched
            osName = 'Windows';
            osVersion = '11';
          } else {
            osName = 'Windows';
            osVersion = '10';
          }
        } else if (ntVersion === '6.3') {
          osName = 'Windows';
          osVersion = '8.1';
        } else if (ntVersion === '6.2') {
          osName = 'Windows';
          osVersion = '8';
        } else if (ntVersion === '6.1') {
          osName = 'Windows';
          osVersion = '7';
        } else if (ntVersion === '6.0') {
          osName = 'Windows';
          osVersion = 'Vista';
        } else if (ntVersion === '5.1' || ntVersion === '5.2') {
          osName = 'Windows';
          osVersion = 'XP';
        } else {
          osName = 'Windows';
          osVersion = ntVersion;
        }
      } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
        osName = 'iOS';
        const match = ua.match(/os ([\d_]+)/);
        osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
      } else if (ua.includes('mac os x')) {
        osName = 'macOS';
        const match = ua.match(/mac os x ([\d_]+)/);
        osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
      } else if (ua.includes('linux')) {
        osName = 'Linux';
      } else if (ua.includes('android')) {
        osName = 'Android';
        const match = ua.match(/android ([\d.]+)/);
        osVersion = match ? match[1] : 'Unknown';
      }
    }

    // Device type detection
    let deviceType = 'desktop';
    let isMobile = false;
    let isTablet = false;
    let isDesktop = true;

    // Check sec-ch-ua-mobile header first for more accurate mobile detection
    if (headers && headers['sec-ch-ua-mobile'] !== undefined) {
      const mobileHeader = headers['sec-ch-ua-mobile'].toLowerCase();
      if (mobileHeader.includes('?1') || mobileHeader === 'true' || mobileHeader === '1') {
        deviceType = 'mobile';
        isMobile = true;
        isDesktop = false;
        console.log('Mobile device detected from sec-ch-ua-mobile header');
      }
    }
    
    // Additional checks from user agent
    if (deviceType === 'desktop') {
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceType = 'mobile';
        isMobile = true;
        isDesktop = false;
        console.log('Mobile device detected from user agent string');
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'tablet';
        isTablet = true;
        isDesktop = false;
        console.log('Tablet device detected from user agent string');
      }
    }
    
    // Specific checks for iPads which may not identify as 'tablet' in newer iOS versions
    if (headers && headers['sec-ch-ua-platform'] && 
        headers['sec-ch-ua-platform'].toLowerCase().includes('ios')) {
      if (ua.includes('ipad') || 
          // Check for typical iPad screen resolutions
          (ua.includes('macintosh') && 
           typeof navigator !== 'undefined' && 
           navigator.maxTouchPoints > 1)) {
        deviceType = 'tablet';
        isTablet = true;
        isMobile = false;
        isDesktop = false;
        console.log('iPad detected from platform header and device characteristics');
      }
    }

    // Create the result object
    const result = {
      browserName,
      browserVersion,
      osName,
      osVersion,
      deviceType,
      isMobile,
      isTablet,
      isDesktop
    };
    
    // Safeguard: ensure browserVersion is not an IP address
    if (result.browserVersion && 
        (result.browserVersion === '140.0.0.0' || 
         result.browserVersion.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/))) {
      console.log('⚠️ Detected IP-like pattern in browserVersion, setting to "Unknown"');
      result.browserVersion = 'Unknown';
    }
    
    // Apply post-processing fixes for special cases
    
    // If detected as Chrome but headers suggest Brave, override it
    if (result.browserName === 'Chrome' && this.detectBraveBrowser(headers)) {
      console.log('Post-processing: Changing Chrome to Brave based on header detection');
      result.browserName = 'Brave';
    }
    
    // If mobile Chrome, make sure it's correctly labeled
    if (result.browserName === 'Chrome' && result.isMobile && !result.browserName.includes('Mobile')) {
      console.log('Post-processing: Labeling as Chrome Mobile');
      result.browserName = 'Chrome Mobile';
    }
    
    // Clean up version strings
    if (result.browserVersion && result.browserVersion.length > 10) {
      // Truncate overly long version strings to first 2 version parts (e.g. 115.0.5790.171 -> 115.0)
      result.browserVersion = result.browserVersion.split('.').slice(0, 2).join('.');
      console.log('Post-processing: Truncated long browser version to', result.browserVersion);
    }
    
    console.log('ParseUserAgent final result:', result);
    return result;
  }

  // Generate device fingerprint for tracking
  generateDeviceFingerprint(userAgent, ipAddress) {
    const crypto = require('crypto');
    const fingerprint = `${userAgent || ''}:${ipAddress || ''}`;
    const hashedFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex');
    console.log('Generated fingerprint for UA:', userAgent?.substring(0, 100) + '...', 'IP:', ipAddress, '->', hashedFingerprint);
    return hashedFingerprint;
  }

  // Email templates for new device/browser notifications
  async sendNewBrowserSignInEmail(userId, email, username, browserInfo, location, ipAddress) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'New Browser Sign-In Detected - SecureShare',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin: 0 0 10px 0;">🔐 New Browser Sign-In Detected</h2>
            <p style="color: #6b7280; margin: 0;">Hi ${username},</p>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; color: #92400e;">
              <strong>⚠️ Security Alert:</strong> We detected a sign-in from a new browser or device.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Sign-In Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Browser:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${browserInfo.browserName} ${browserInfo.browserVersion}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Operating System:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${browserInfo.osName} ${browserInfo.osVersion}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Device Type:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${browserInfo.deviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Location:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${location || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">IP Address:</td>
                <td style="padding: 8px 0;">${ipAddress || 'Unknown'}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; color: #065f46;">
              <strong> Was this you?</strong>
            </p>
            <p style="margin: 0 0 15px 0; color: #065f46;">
              If you recently signed in from this browser/device, no action is needed.
            </p>
            <p style="margin: 0; color: #065f46;">
              If this wasn't you, please <a href="${process.env.FRONTEND_URL}/settings/security" style="color: #059669; text-decoration: underline;">change your password immediately</a> and review your account activity.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Manage Your Devices:</h3>
            <p style="margin: 0 0 15px 0;">
              You can view and manage all your active sessions in your account settings.
            </p>
            <a href="${process.env.FRONTEND_URL}/settings/security" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Active Sessions</a>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. You can manage your notification preferences in your account settings.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('New browser sign-in alert email sent to:', email);
    } catch (error) {
      console.error('Failed to send new browser sign-in alert email:', error);
    }
  }

  async sendNewDeviceLinkedEmail(userId, email, username, deviceInfo, deviceType) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'New Device Linked - SecureShare',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin: 0 0 10px 0;">🔗 New Device Linked</h2>
            <p style="color: #6b7280; margin: 0;">Hi ${username},</p>
          </div>

          <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px 0; color: #065f46;">
              <strong>Device Successfully Linked</strong>
            </p>
            <p style="margin: 0; color: #065f46;">
              A new ${deviceType} device has been linked to your SecureShare account.
            </p>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Device Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Device Type:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${deviceType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Operating System:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${deviceInfo.osName} ${deviceInfo.osVersion}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Browser:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${deviceInfo.browserName} ${deviceInfo.browserVersion}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Linked At:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Manage Your Devices:</h3>
            <p style="margin: 0 0 15px 0;">
              You can view and manage all your linked devices in your account settings.
            </p>
            <a href="${process.env.FRONTEND_URL}/settings/security" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Manage Devices</a>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from SecureShare. You can manage your notification preferences in your account settings.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('New device linked email sent to:', email);
    } catch (error) {
      console.error('Failed to send new device linked email:', error);
    }
  }

  /**
   * Verify mnemonic words and validate password recovery
   * @param {string} userId
   * @param {string[]} mnemonicWords
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async verifyMnemonic(userId, mnemonicWords, req = null) {
    try {
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("password, passwordB")
        .eq("id", userId)
        .single();

      if (fetchError || !user) {
        throw new Error("User not found");
      }

      if (!user.passwordB) {
        throw new Error("No mnemonic recovery data found. Please contact support.");
      }

      const MnemonicCrypto = require("../utils/mnemonicCrypto");

      const encryptionKey = MnemonicCrypto.deriveKeyFromMnemonic(mnemonicWords);

      const decryptedPassword = MnemonicCrypto.decrypt(user.passwordB, encryptionKey);

      const isValid = await MnemonicCrypto.validatePassword(decryptedPassword, user.password);

      if (!isValid) {
        console.warn(`Invalid mnemonic attempt for user ${userId} from IP ${req?.ip || 'unknown'}`);
        throw new Error("Invalid mnemonic words");
      }

      return { success: true, message: "Mnemonic verified successfully" };

    } catch (error) {
      console.error(`Mnemonic verification failed for user ${userId}:`, error.message);
      throw new Error("Invalid mnemonic words");
    }
  }

  /**
   * Change password using mnemonic verification
   * @param {string} userId
   * @param {string[]} mnemonicWords
   * @param {string} newPassword
   * @returns {Promise<{success: boolean, newMnemonicWords?: string[], message?: string}>}
   */
  async changePasswordWithMnemonic(userId, mnemonicWords, newPassword) {
    try {
      await this.verifyMnemonic(userId, mnemonicWords);

      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("password, passwordB, email, username")
        .eq("id", userId)
        .single();

      if (fetchError || !user) {
        throw new Error("User not found");
      }

      const MnemonicCrypto = require("../utils/mnemonicCrypto");

      const oldEncryptionKey = MnemonicCrypto.deriveKeyFromMnemonic(mnemonicWords);

      const originalPassword = MnemonicCrypto.decrypt(user.passwordB, oldEncryptionKey);

      try {
        const reEncryptResult = await this.reEncryptVaultKeys(userId, originalPassword, newPassword);
        if (reEncryptResult === true) {
          console.log(`Successfully re-encrypted vault keys for user ${userId} during password change`);
        } else if (reEncryptResult === 'skipped') {
          console.log(`Vault key re-encryption was skipped for user ${userId} (likely due to sodium issues)`);
        } else {
          console.log(`Vault key re-encryption completed with result: ${reEncryptResult}`);
        }
      } catch (keyError) {
        console.error(`Failed to re-encrypt vault keys for user ${userId}:`, keyError.message);
        if (!keyError.message.includes('skipped')) {
          throw new Error("Failed to update vault keys. Please try again.");
        }
      }

      const hashedNewPassword = await MnemonicCrypto.hashPassword(newPassword);

      const newMnemonicWords = MnemonicCrypto.generateMnemonic();

      const newEncryptionKey = MnemonicCrypto.deriveKeyFromMnemonic(newMnemonicWords);

      const newPasswordB = MnemonicCrypto.encrypt(newPassword, newEncryptionKey);

      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn(`SUPABASE_SERVICE_ROLE_KEY not found, using ANON_KEY for user ${userId} update`);
        console.warn('This may cause permission issues with user updates');
      }

      const { data: verifyUser, error: verifyError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      if (verifyError || !verifyUser) {
        console.error(`User verification failed for ${userId}:`, verifyError);
        throw new Error("User not found during password update");
      }

      if (!hashedNewPassword || hashedNewPassword.length < 10) {
        throw new Error("Invalid hashed password generated");
      }
      if (!newPasswordB || newPasswordB.length === 0) {
        throw new Error("Invalid encrypted password generated");
      }

      console.log(`Data validation passed for user ${userId}`);

      console.log(`Updating user ${userId} password in database...`);
      const updateData = {
        password: hashedNewPassword,
        passwordB: newPasswordB,
        needs_key_reencryption: false,
        resetPasswordPIN: null,
        resetPINExpiry: null,
      };

      console.log(`Update data for user ${userId}:`, {
        hasPassword: !!hashedNewPassword,
        hasPasswordB: !!newPasswordB,
        passwordBLength: newPasswordB?.length,
        needs_key_reencryption: false
      });

      const { error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);

      if (updateError) {
        console.error(`Database update error for user ${userId}:`, updateError);
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      console.log(`Successfully updated password for user ${userId}`);

      // Send email with new mnemonic words
      try {
        await this.sendMnemonicEmail(user.email, user.username || 'User', newMnemonicWords);
        console.log(`Recovery email sent to ${user.email} for user ${userId}`);
      } catch (emailError) {
        console.error(`Failed to send recovery email to ${user.email}:`, emailError.message);
        // Don't fail the password change if email fails, but log it
      }

      console.log(`Password successfully changed for user ${userId} using mnemonic recovery`);

      return {
        success: true,
        newMnemonicWords,
        message: "Password changed successfully"
      };

    } catch (error) {
      console.error(`Password change with mnemonic failed for user ${userId}:`, error.message);
      throw new Error("Failed to change password: " + error.message);
    }
  }

  /**
   * Re-encrypt vault keys with a new password-derived key
   * @param {string} userId
   * @param {string} oldPassword
   * @param {string} newPassword
   * @returns {Promise<boolean>}
   */
  async reEncryptVaultKeys(userId, oldPassword, newPassword) {
    try {
      const VaultController = require("../controllers/vaultController");

      const sodium = await this.initializeSodium();

      console.log(`Starting vault key re-encryption for user ${userId}`);

      const keyBundle = await VaultController.retrieveKeyBundle(userId);
      if (!keyBundle || keyBundle.status !== 'success') {
        console.log(`No vault keys found for user ${userId}, skipping re-encryption`);
        return true;
      }

      if (!keyBundle.ik_private_key || !keyBundle.spk_private_key || !keyBundle.opks_private) {
        console.log(`Incomplete vault keys found for user ${userId}, skipping re-encryption`);
        return true;
      }

      console.log(`Found vault keys for user ${userId}: ik=${!!keyBundle.ik_private_key}, spk=${!!keyBundle.spk_private_key}, opks=${keyBundle.opks_private.length}`);

      const { data: user, error } = await supabase
        .from("users")
        .select("salt, nonce")
        .eq("id", userId)
        .single();

      if (error || !user) {
        throw new Error("User not found");
      }

      if (!user.salt || !user.nonce) {
        console.log(`User ${userId} missing salt or nonce, skipping re-encryption`);
        return true;
      }

      console.log(`Deriving old key for user ${userId} with salt length: ${user.salt.length}`);
      const oldDerivedKey = sodium.crypto_pwhash(
        32,
        oldPassword,
        sodium.from_base64(user.salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );
      console.log(`Old key derived successfully, length: ${oldDerivedKey.length}`);

      const encryptionPassword = newPassword && newPassword.trim() ? newPassword : oldPassword;
      console.log(`Deriving new key for user ${userId} with password length: ${encryptionPassword.length}`);
      const newDerivedKey = sodium.crypto_pwhash(
        32,
        encryptionPassword,
        sodium.from_base64(user.salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );
      console.log(`New key derived successfully, length: ${newDerivedKey.length}`);

      let decryptedIkPrivateKey, decryptedSpkPrivateKey, decryptedOpksPrivate;

      try {
        if (!keyBundle.ik_private_key) {
          throw new Error("Identity key not found in vault");
        }
        decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(keyBundle.ik_private_key),
          sodium.from_base64(user.nonce),
          oldDerivedKey
        );
      } catch (e) {
        throw new Error("Failed to decrypt identity key: " + e.message);
      }

      try {
        if (!keyBundle.spk_private_key) {
          throw new Error("Signed prekey not found in vault");
        }
        decryptedSpkPrivateKey = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(keyBundle.spk_private_key),
          sodium.from_base64(user.nonce),
          oldDerivedKey
        );
      } catch (e) {
        throw new Error("Failed to decrypt signed prekey: " + e.message);
      }

      decryptedOpksPrivate = [];
      if (keyBundle.opks_private && Array.isArray(keyBundle.opks_private)) {
        for (const opk of keyBundle.opks_private) {
          try {
            if (!opk.private_key) {
              console.warn(`One-time prekey ${opk.opk_id} missing private key, skipping`);
              continue;
            }
            const decryptedOpk = sodium.crypto_secretbox_open_easy(
              sodium.from_base64(opk.private_key),
              sodium.from_base64(user.nonce),
              oldDerivedKey
            );
            decryptedOpksPrivate.push({
              opk_id: opk.opk_id,
              private_key: sodium.to_base64(decryptedOpk)
            });
          } catch (e) {
            console.warn(`Failed to decrypt one-time prekey ${opk.opk_id}:`, e.message);
          }
        }
      }
      console.log(`Successfully decrypted ${decryptedOpksPrivate.length} one-time prekeys for user ${userId}`);

      const newNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

      const reEncryptedIkPrivateKey = sodium.to_base64(
        sodium.crypto_secretbox_easy(decryptedIkPrivateKey, newNonce, newDerivedKey)
      );

      const reEncryptedSpkPrivateKey = sodium.to_base64(
        sodium.crypto_secretbox_easy(decryptedSpkPrivateKey, newNonce, newDerivedKey)
      );

      const reEncryptedOpksPrivate = [];
      for (const opk of decryptedOpksPrivate) {
        const decryptedOpkKey = sodium.from_base64(opk.private_key);
        const reEncryptedOpk = sodium.to_base64(
          sodium.crypto_secretbox_easy(decryptedOpkKey, newNonce, newDerivedKey)
        );
        reEncryptedOpksPrivate.push({
          opk_id: opk.opk_id,
          private_key: reEncryptedOpk
        });
      }

      const vaultResult = await VaultController.storeKeyBundle({
        encrypted_id: userId,
        ik_private_key: reEncryptedIkPrivateKey,
        spk_private_key: reEncryptedSpkPrivateKey,
        opks_private: reEncryptedOpksPrivate,
      });

      if (!vaultResult || vaultResult.status !== 'success') {
        throw new Error("Failed to store re-encrypted keys in vault");
      }

      const { error: nonceUpdateError } = await supabase
        .from("users")
        .update({ nonce: sodium.to_base64(newNonce) })
        .eq("id", userId);

      if (nonceUpdateError) {
        console.error("Failed to update user nonce:", nonceUpdateError);
      }

      console.log(`Successfully re-encrypted vault keys for user ${userId}`);
      return true;

    } catch (error) {
      console.error(`Failed to re-encrypt vault keys for user ${userId}:`, error.message);
      throw new Error("Failed to re-encrypt vault keys: " + error.message);
    }
  }

  /**
   * Re-encrypt vault keys using mnemonic recovery
   * @param {string} userId
   * @param {string[]} mnemonicWords
   * @param {string} newPassword 
   * @returns {Promise<boolean>}
   */
  async reEncryptVaultKeysWithMnemonic(userId, mnemonicWords, newPassword) {
    try {
      await this.verifyMnemonic(userId, mnemonicWords);

      const { data: user, error } = await supabase
        .from("users")
        .select("passwordB, salt")
        .eq("id", userId)
        .single();

      if (error || !user) {
        throw new Error("User not found");
      }

      if (!user.passwordB) {
        console.log(`No passwordB found for user ${userId}, skipping re-encryption`);
        return true;
      }

      const MnemonicCrypto = require("../utils/mnemonicCrypto");

      const mnemonicKey = MnemonicCrypto.deriveKeyFromMnemonic(mnemonicWords);

      const oldPassword = MnemonicCrypto.decrypt(user.passwordB, mnemonicKey);

      await this.reEncryptVaultKeys(userId, oldPassword, newPassword);

      await supabase
        .from("users")
        .update({ needs_key_reencryption: false })
        .eq("id", userId);

      return true;
    } catch (error) {
      console.error(`Failed to re-encrypt vault keys with mnemonic for user ${userId}:`, error.message);
      throw new Error("Failed to re-encrypt vault keys: " + error.message);
    }
  }
}

module.exports = new UserService();