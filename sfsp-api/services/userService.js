/* global process */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { supabase } = require("../config/database");
require("dotenv").config();

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
   * Re-encrypts user keys immediately and starts background job for files
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
      fileCount = 0, // Number of files to re-encrypt in background
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

      // 8. Start background file re-encryption if user has files
      if (fileCount > 0) {
        console.log(`Starting background re-encryption for ${fileCount} files for user ${userId}`);

        // Start background process (non-blocking)
        this.reencryptFilesInBackground(userId, email, user.username, oldDerivedKey, newDerivedKey, fileCount)
          .catch(error => {
            console.error('Background file re-encryption failed:', error);
          });
      }

      return {
        success: true,
        message: fileCount > 0
          ? "Password reset successfully. Your files are being re-encrypted in the background."
          : "Password reset successfully",
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

  /**
   * Background process to re-encrypt all user files after password reset
   * Sends email notification when complete
   */
  async reencryptFilesInBackground(userId, email, username, oldDerivedKey, newDerivedKey, expectedFileCount) {
    const axios = require('axios');
    const sodium = require("libsodium-wrappers");
    await sodium.ready;

    const fileServiceUrl = process.env.FILE_SERVICE_URL || "http://localhost:8081";
    const startTime = Date.now();

    let filesProcessed = 0;
    let filesSucceeded = 0;
    let filesFailed = 0;
    const failedFiles = [];

    try {
      console.log(`[Background Re-encryption] Starting for user ${userId} (${expectedFileCount} files expected)`);

      // 1. Fetch all user files metadata
      const metadataResponse = await axios.post(`${fileServiceUrl}/metadata`, {
        userId: userId,
      });

      const userFiles = Array.isArray(metadataResponse.data) ? metadataResponse.data : [];
      console.log(`[Background Re-encryption] Found ${userFiles.length} files to process`);

      if (userFiles.length === 0) {
        console.log(`[Background Re-encryption] No files found for user ${userId}`);
        await this.sendFileReencryptionCompleteEmail(email, username, 0, 0, 0, []);
        return;
      }

      const oldDerivedKeyBytes = sodium.from_base64(oldDerivedKey);
      const newDerivedKeyBytes = sodium.from_base64(newDerivedKey);

      // 2. Process each file
      for (const file of userFiles) {
        try {
          filesProcessed++;
          console.log(`[Background Re-encryption] Processing file ${filesProcessed}/${userFiles.length}: ${file.fileName}`);

          // Download encrypted file
          const downloadResponse = await axios.post(
            `${fileServiceUrl}/download`,
            {
              userId: userId,
              fileId: file.fileId,
            },
            { responseType: 'arraybuffer' }
          );

          const encryptedFile = new Uint8Array(downloadResponse.data);
          const oldNonce = downloadResponse.headers['x-nonce'];

          if (!oldNonce) {
            throw new Error('Missing nonce header');
          }

          // Decrypt with old key
          const decryptedFile = sodium.crypto_secretbox_open_easy(
            encryptedFile,
            sodium.from_base64(oldNonce, sodium.base64_variants.ORIGINAL),
            oldDerivedKeyBytes
          );

          if (!decryptedFile) {
            throw new Error('Decryption failed');
          }

          // Encrypt with new key
          const newFileNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
          const reencryptedFile = sodium.crypto_secretbox_easy(
            decryptedFile,
            newFileNonce,
            newDerivedKeyBytes
          );

          // Update file in database
          await axios.post(`${fileServiceUrl}/updateFile`, {
            userId: userId,
            fileId: file.fileId,
            nonce: sodium.to_base64(newFileNonce, sodium.base64_variants.ORIGINAL),
            fileContent: sodium.to_base64(reencryptedFile, sodium.base64_variants.ORIGINAL),
          });

          filesSucceeded++;
          console.log(`[Background Re-encryption] Successfully re-encrypted file ${file.fileName}`);

        } catch (fileError) {
          filesFailed++;
          failedFiles.push({
            fileName: file.fileName,
            fileId: file.fileId,
            error: fileError.message,
          });
          console.error(`[Background Re-encryption] Failed to re-encrypt file ${file.fileName}:`, fileError.message);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[Background Re-encryption] Completed in ${duration}s - Success: ${filesSucceeded}, Failed: ${filesFailed}`);

      // 3. Send completion email
      await this.sendFileReencryptionCompleteEmail(email, username, filesProcessed, filesSucceeded, filesFailed, failedFiles);

    } catch (error) {
      console.error('[Background Re-encryption] Fatal error:', error);

      // Send error notification email
      try {
        await this.sendFileReencryptionErrorEmail(email, username, filesProcessed, filesSucceeded, filesFailed, error.message);
      } catch (emailError) {
        console.error('[Background Re-encryption] Failed to send error email:', emailError);
      }
    }
  }

  /**
   * Send email notification when file re-encryption completes successfully
   */
  async sendFileReencryptionCompleteEmail(email, username, totalFiles, successCount, failedCount, failedFiles) {
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

      const failedFilesList = failedFiles.length > 0
        ? `<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
             <p style="margin: 0 0 10px 0; color: #856404; font-size: 14px;">
               ⚠️ <strong>Warning:</strong> ${failedCount} file(s) could not be re-encrypted:
             </p>
             <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 13px;">
               ${failedFiles.map(f => `<li>${f.fileName}</li>`).join('')}
             </ul>
             <p style="margin: 10px 0 0 0; color: #856404; font-size: 13px;">
               Please contact support if you need assistance with these files.
             </p>
           </div>`
        : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>File Re-encryption Complete</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">File Re-encryption Complete</h1>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${username}</strong>,</p>

            <p style="margin-bottom: 25px;">Your password reset is complete! We've successfully re-encrypted your files with your new password.</p>

            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; font-size: 14px; color: #666; margin-bottom: 15px; text-align: center;">Re-encryption Summary:</p>
              <table style="width: 100%; font-size: 15px;">
                <tr>
                  <td style="padding: 8px 0; color: #555;">Total Files Processed:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #667eea;">${totalFiles}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #555;">Successfully Re-encrypted:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #28a745;">${successCount}</td>
                </tr>
                ${failedCount > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #555;">Failed:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #dc3545;">${failedCount}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${failedFilesList}

            ${failedCount === 0 ? `
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #155724; font-size: 15px;">
                ✅ <strong>All your files have been successfully secured with your new password!</strong>
              </p>
            </div>
            ` : ''}

            <p style="margin-bottom: 20px;">You can now access all your files using your new password. Your data remains secure and encrypted.</p>

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

Your password reset is complete! We've successfully re-encrypted your files with your new password.

Re-encryption Summary:
- Total Files Processed: ${totalFiles}
- Successfully Re-encrypted: ${successCount}
${failedCount > 0 ? `- Failed: ${failedCount}` : ''}

${failedFiles.length > 0 ? `
Files that could not be re-encrypted:
${failedFiles.map(f => `- ${f.fileName}`).join('\n')}

Please contact support if you need assistance with these files.
` : 'All your files have been successfully secured with your new password!'}

You can now access all your files using your new password.

---
This is an automated message, please do not reply to this email.
      `;

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || "SecureShare",
          address: process.env.FROM_EMAIL || process.env.SMTP_USER,
        },
        to: email,
        subject: failedCount > 0
          ? "File Re-encryption Complete (with warnings) - SecureShare"
          : "File Re-encryption Complete - SecureShare",
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("File re-encryption completion email sent:", info.messageId);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending file re-encryption completion email:", error);
      throw new Error("Failed to send completion email");
    }
  }

  /**
   * Send email notification when file re-encryption encounters a fatal error
   */
  async sendFileReencryptionErrorEmail(email, username, filesProcessed, filesSucceeded, filesFailed, errorMessage) {
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
          <title>File Re-encryption Error</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">File Re-encryption Issue</h1>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #dee2e6;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi <strong>${username}</strong>,</p>

            <p style="margin-bottom: 25px;">Your password was successfully reset, but we encountered an issue while re-encrypting your files in the background.</p>

            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #721c24; font-size: 14px;">
                ❌ <strong>Re-encryption Status:</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #721c24; font-size: 13px;">
                <li>Files Processed: ${filesProcessed}</li>
                <li>Successfully Re-encrypted: ${filesSucceeded}</li>
                <li>Failed: ${filesFailed}</li>
              </ul>
            </div>

            <p style="margin-bottom: 20px;"><strong>What this means:</strong></p>
            <ul style="margin-bottom: 20px;">
              <li>Your password has been changed successfully</li>
              <li>You can log in with your new password</li>
              <li>Some files may still be encrypted with your old password</li>
            </ul>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #856404; font-size: 15px;">
                ⚠️ <strong>Action Required:</strong> Please contact our support team for assistance.
              </p>
            </div>

            <p style="margin-bottom: 20px; font-size: 13px; color: #666;">Technical details: ${errorMessage}</p>

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

Your password was successfully reset, but we encountered an issue while re-encrypting your files in the background.

Re-encryption Status:
- Files Processed: ${filesProcessed}
- Successfully Re-encrypted: ${filesSucceeded}
- Failed: ${filesFailed}

What this means:
- Your password has been changed successfully
- You can log in with your new password
- Some files may still be encrypted with your old password

Action Required: Please contact our support team for assistance.

Technical details: ${errorMessage}

---
This is an automated message, please do not reply to this email.
      `;

      const mailOptions = {
        from: {
          name: process.env.FROM_NAME || "SecureShare",
          address: process.env.FROM_EMAIL || process.env.SMTP_USER,
        },
        to: email,
        subject: "File Re-encryption Issue - Action Required - SecureShare",
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("File re-encryption error email sent:", info.messageId);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending file re-encryption error email:", error);
      throw new Error("Failed to send error email");
    }
  }
}

module.exports = new UserService();