/* global process */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { supabase } = require("../config/database");

class UserService {
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
      recovery_key_encrypted,
      recovery_key_nonce,
      recovery_salt,
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

      const newsalt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, newsalt);
      const resetPasswordPIN = this.generatePIN();

      const { data: newUser, error } = await supabase
        .from("users")
        .insert([
          {
            username,
            email,
            password: hashedPassword,
            resetPasswordPIN,
            ik_public,
            spk_public,
            opks_public,
            nonce,
            signedPrekeySignature,
            salt,
            recovery_key_encrypted,
            recovery_key_nonce,
            recovery_salt,
            is_verified: false, // New users need email verification
          },
        ])
        .select("*")
        .single();

      if (error) {
        throw new Error("Failed to create user: " + error.message);
      }
      const token = this.generateToken(newUser.id);

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          is_verified: newUser.is_verified,
        },
        token,
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
      const { data, error } = await supabase
        .from("users")
        .select("username, avatar_url,email")
        .eq("id", userId)
        .single();

      if (error || !data) {
        throw new Error("This userId was not found");
      }

      return data;
    } catch (error) {
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

      if(!user.active) {
        throw new Error("User account has been blocked by admin.");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid password.");
      }

      const token = this.generateToken(user.id);
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

      const token = this.generateToken(user.id);
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

  generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
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
        .select("resetPasswordPIN, resetPINExpiry")
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
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: hashedPassword,
          resetPasswordPIN: null,
          resetPINExpiry: null,
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error("Failed to update password");
      }

      return { success: true, message: "Password updated successfully" };
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

  /**
   * Reset password using recovery key
   * Re-encrypts user keys and files with new password-derived key
   */
  async resetPasswordWithRecovery(resetData) {
    const {
      userId,
      email,
      newPassword,
      oldDerivedKey,
      newDerivedKey,
      newSalt,
      recovery_key_encrypted,
      recovery_key_nonce,
      oldNonce,
      reencryptedFiles = [], // Array of re-encrypted files from frontend
    } = resetData;

    try {
      // 1. Fetch user to verify they exist
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .eq("email", email)
        .single();

      if (fetchError || !user) {
        throw new Error("User not found");
      }

      // 2. Hash the new password
      const newsalt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, newsalt);

      // 3. Fetch encrypted keys from vault
      const VaultController = require("../controllers/vaultController");
      const vault = new VaultController();

      const keyBundleResult = await vault.retrieveKeyBundle(userId);

      if (!keyBundleResult || !keyBundleResult.data) {
        throw new Error("Failed to retrieve key bundle from vault");
      }

      const {
        ik_private_key: encryptedIkPrivate,
        spk_private_key: spkPrivate,
        opks_private: encryptedOpks,
      } = keyBundleResult.data?.data;

      // 4. Decrypt keys with old derived key (from recovery)
      // Note: Keys are base64 encoded in vault, need to decode
      const sodium = require("libsodium-wrappers");
      await sodium.ready;

      const oldDerivedKeyBytes = sodium.from_base64(oldDerivedKey);
      const oldNonceBytes = sodium.from_base64(oldNonce);

      // Decrypt identity key
      const decryptedIkPrivate = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(encryptedIkPrivate),
        oldNonceBytes,
        oldDerivedKeyBytes
      );

      if (!decryptedIkPrivate) {
        throw new Error("Failed to decrypt identity key with old derived key");
      }

      // Decrypt OPKs
      const decryptedOpks = encryptedOpks.map((opk) => {
        const decrypted = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(opk.private_key),
          oldNonceBytes,
          oldDerivedKeyBytes
        );
        if (!decrypted) {
          throw new Error(`Failed to decrypt OPK ${opk.opk_id}`);
        }
        return {
          opk_id: opk.opk_id,
          private_key: decrypted,
        };
      });

      // 5. Re-encrypt keys with new derived key
      const newDerivedKeyBytes = sodium.from_base64(newDerivedKey);
      const newNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

      const newEncryptedIkPrivate = sodium.crypto_secretbox_easy(
        decryptedIkPrivate,
        newNonce,
        newDerivedKeyBytes
      );

      const newEncryptedOpks = decryptedOpks.map((opk) => ({
        opk_id: opk.opk_id,
        private_key: sodium.to_base64(
          sodium.crypto_secretbox_easy(opk.private_key, newNonce, newDerivedKeyBytes)
        ),
      }));

      // 6. Update database with new password and recovery data
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: hashedPassword,
          salt: newSalt,
          nonce: sodium.to_base64(newNonce),
          recovery_key_encrypted,
          recovery_key_nonce,
          resetPasswordPIN: null, // Clear any existing reset PIN
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error("Failed to update user: " + updateError.message);
      }

      // 7. Update vault with re-encrypted keys
      await vault.storeKeyBundle({
        encrypted_id: userId,
        ik_private_key: sodium.to_base64(newEncryptedIkPrivate),
        spk_private_key: spkPrivate, // SPK doesn't change
        opks_private: newEncryptedOpks,
      });

      // 8. Re-upload re-encrypted files to file service
      const axios = require('axios');
      const fileServiceUrl = process.env.FILE_SERVICE_URL || "http://localhost:8081";

      let filesUpdated = 0;
      for (const file of reencryptedFiles) {
        try {
          // Update file with new encrypted content and nonce
          const updateResponse = await axios.post(
            `${fileServiceUrl}/updateFile`,
            {
              userId: userId,
              fileId: file.fileId,
              nonce: file.nonce,
              fileContent: file.encryptedContent,
            }
          );

          if (updateResponse.status === 200) {
            filesUpdated++;
          }
        } catch (fileError) {
          console.error(`Failed to update file ${file.fileId}:`, fileError.message);
          // Continue with other files even if one fails
        }
      }

      console.log(`Password reset: Updated ${filesUpdated}/${reencryptedFiles.length} files`);

      return {
        success: true,
        message: "Password reset successfully",
        filesUpdated,
        totalFiles: reencryptedFiles.length,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error) {
      console.error("Password reset error:", error);
      throw new Error("Password reset failed: " + error.message);
    }
  }
}

module.exports = new UserService();