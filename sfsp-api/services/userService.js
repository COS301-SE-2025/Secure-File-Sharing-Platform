/* global process */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { supabase } = require("../config/database");

class UserService {
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

      if (error || !data) {
        throw new Error("This user ID was not found");
      }

      const { id } = data;

      return { id };
    } catch (error) {
      throw new Error("Fetching User ID failed: " + error.message);
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

        // ✅ Select a random OPK
        if (Array.isArray(opkArray) && opkArray.length > 0) {
          const index = Math.floor(Math.random() * opkArray.length);
          selectedOpk = opkArray[index];
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
}

module.exports = new UserService();
