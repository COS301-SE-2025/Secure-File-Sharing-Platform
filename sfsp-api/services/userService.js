/* global process */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { supabase } = require("../config/database");
const geoip = require('geoip-lite');

class UserService {
  getLocationFromIP(ipAddress) {
    try {
      if (!ipAddress) {
        console.log('No IP address provided for geolocation');
        return 'No IP detected';
      }
      
      console.log('Attempting to geolocate IP:', ipAddress);
      
      const cleanIp = ipAddress.replace(/^::ffff:/, '');
      
      if (cleanIp === '127.0.0.1' || 
          cleanIp === 'localhost' || 
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
        return 'Local Network';
      }
      
      if (cleanIp.startsWith('140.') || cleanIp === '140.0.0.0') {
        console.log('South African IP range detected:', cleanIp);
        return 'Pretoria, South Africa';
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
      console.log('Attempting to get user info for ID:', userId);
      
      // Input validation
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

      const isPasswordValid = await bcrypt.compare(password, user.password);
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

  // Email notification functions
  async sendStorageAlertEmail(userId, email, username, usedSpace, totalSpace) {
    const shouldSend = await this.shouldSendEmail(userId, 'runningOutOfSpace', 'alerts');
    if (!shouldSend) return;

    const transporter = nodemailer.createTransporter({
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

    const transporter = nodemailer.createTransporter({
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

    const transporter = nodemailer.createTransporter({
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

    const transporter = nodemailer.createTransporter({
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

    const transporter = nodemailer.createTransporter({
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

    const transporter = nodemailer.createTransporter({
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
    const location = this.getLocationFromIP(ipAddress);
    
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
        // Check if IP address has changed, update location if needed
        const updateData = {
          last_login_at: new Date().toISOString(),
          login_count: existingSession.login_count + 1,
          is_active: true
        };
        
        // If IP has changed, update IP and location
        if (ipAddress && existingSession.ip_address !== ipAddress) {
          updateData.ip_address = ipAddress;
          updateData.location = location;
        }
        
        // Update existing session
        const { data, error } = await supabase
          .from('user_sessions')
          .update(updateData)
          .eq('id', existingSession.id)
          .select()
          .single();

        if (error) throw error;
        return { session: data, isNewDevice: false };
      } else {
        // Create new session
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
      // Check if userId is valid
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
      
      // Update locations for sessions with missing or unknown locations
      const updatedSessions = await this.updateSessionLocations(data);
      
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
      
      // Always update South African IPs with 140.x.x.x pattern
      if (session.ip_address && (
          !session.location || 
          session.location === 'Unknown Location' || 
          session.location === 'unknown' ||
          session.location === 'Local Network' ||
          (session.ip_address.startsWith('140.') && session.location !== 'Pretoria, South Africa')
      )) {
        console.log(`Re-calculating location for session ${session.id} with IP ${session.ip_address}`);
        const location = this.getLocationFromIP(session.ip_address);
        console.log(`New location determined: ${location}`);
        
        updatedSessions[i].location = location;
        
        // Add to batch update if location was determined
        if (location) {
          sessionsToUpdate.push({
            id: session.id,
            location: location
          });
        }
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
      
      console.log('Deactivating session ID:', sessionId, 'for user ID:', userId);
      
      const { data, error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deactivating user session:', error);
      throw new Error('Failed to deactivate session: ' + error.message);
    }
  }

  // Parse user agent string to extract device/browser info
  parseUserAgent(userAgent) {
    if (!userAgent) return {};

    const ua = userAgent.toLowerCase();
    console.log('Parsing user agent:', ua);

    // Browser detection
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    // Edge detection - must come before Chrome since Edge also includes 'chrome' in UA
    if (ua.includes('edg/') || ua.includes('edge/')) {
      browserName = 'Edge';
      // Try the modern Edge version format first (Chromium-based)
      let match = ua.match(/edg(?:e)?\/([\d.]+)/);
      if (!match) {
        // Try alternative patterns
        match = ua.match(/edge\/([\d.]+)/);
      }
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('chrome') && !ua.includes('chromium')) {
      browserName = 'Chrome';
      const match = ua.match(/chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('firefox')) {
      browserName = 'Firefox';
      const match = ua.match(/firefox\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browserName = 'Safari';
      const match = ua.match(/version\/([\d.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    // OS detection
    let osName = 'Unknown';
    let osVersion = 'Unknown';

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

    // Device type detection
    let deviceType = 'desktop';
    let isMobile = false;
    let isTablet = false;
    let isDesktop = true;

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'mobile';
      isMobile = true;
      isDesktop = false;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
      isTablet = true;
      isDesktop = false;
    }

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
    
    console.log('ParseUserAgent result:', result);
    return result;
  }

  // Generate device fingerprint for tracking
  generateDeviceFingerprint(userAgent, ipAddress) {
    const crypto = require('crypto');
    const fingerprint = `${userAgent || ''}:${ipAddress || ''}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
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
}

module.exports = new UserService();