// services/adminService.js
const { supabase } = require("../config/database");
const MnemonicCrypto = require("../utils/mnemonicCrypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const adminService = {
  async login({ email, password }) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("role", "admin")
        .single();

      if (error || !user) {
        throw new Error("Admin not found or unauthorized.");
      }

      const isPasswordValid = await MnemonicCrypto.validatePassword(
        password,
        user.password
      );

      if (!isPasswordValid) {
        throw new Error("Invalid password.");
      }

      const token = jwt.sign(
        { userId: user.id, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return {
        user: {
          id: user.id,
          avatar: user.avatar_url,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      };
    } catch (err) {
      throw new Error("Admin login failed: " + err.message);
    }
  },

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
  },

  async verifyCode(userId, code) {
    try {
      const { data: record, error } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("user_id", userId)
        .eq("code", code)
        .eq("used", false)
        .single();

      if (error || !record) {
        return { success: false, message: "Invalid or expired code." };
      }

      if (new Date(record.expires_at) < new Date()) {
        return { success: false, message: "Code has expired." };
      }

      // mark code as used
      await supabase
        .from("verification_codes")
        .update({ used: true })
        .eq("id", record.id);

      return { success: true, message: "Code verified successfully." };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async sendMessage(userId, email, username, subject, message) {
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
      <head><meta charset="utf-8"></head>
      <body>
        <p>Hi <strong>${username}</strong>,</p>
        <p>${message}</p>
        <hr>
        <p style="font-size:12px;color:#666;">Kind Regards, Team CacheME</p>
      </body>
      </html>
    `;

      const textContent = `Hi ${username},\n\n${message}\n\nKind Regards, Team CacheME`;

      const mailOptions = {
        from: { name: process.env.FROM_NAME || "SecureShare", address: process.env.FROM_EMAIL || process.env.SMTP_USER },
        to: email,
        subject,
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Failed to send email: " + error.message);
    }
  },

  // ============================= USERS PAGE =============================

  async getUserCount() {
    try {
      const { count: totalUsers, error: totalError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      if (totalError) {
        throw new Error("Failed to fetch total user count: " + totalError.message);
      }

      const { count: adminUsers, error: adminError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (adminError) {
        throw new Error("Failed to fetch admin user count: " + adminError.message);
      }

      return { totalUsers, adminUsers };
    } catch (err) {
      throw new Error(err.message);
    }
  },

  async getAllUsers() {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username, username, email, role, is_verified, created_at,avatar_url,active,blocked_info");

      if (error) throw new Error(error.message);

      return users;
    } catch (err) {
      throw new Error("Failed to fetch users: " + err.message);
    }
  },

  async updateUserRole(userId, newRole) {
    const { data, error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async createAdmin({ username, email }) {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("email", email)
        .single();

      if (error || !user) {
        throw new Error("User not found with provided username and email.");
      }

      if (!user.password || user.password === "") {
        throw new Error("Cannot make this user an admin: user has no password (likely a Google account).");
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({ role: "admin" })
        .eq("id", user.id)
        .select("*")
        .single();

      if (updateError) throw new Error(updateError.message);

      return updatedUser;
    } catch (err) {
      throw new Error("Failed to create admin: " + err.message);
    }
  },

  async blockUser(userId, blockedInfo) {
    const { data, error } = await supabase
      .from("users")
      .update({
        active: false,
        blocked_info: blockedInfo,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteUser(userId) {
    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // ============================= BLOCKED USERS PAGE =============================

  async getBlockedUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email, blocked_info, active, avatar_url")
      .neq("blocked_info", null); // only users with blocked_info set

    if (error) throw new Error(error.message);
    return data;
  },

  async unblockUser(userId) {
    const { data, error } = await supabase
      .from("users")
      .update({
        active: true,
        blocked_info: null,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getBlockedStats() {
    const { data, error } = await supabase
      .from("users")
      .select("blocked_info")
      .neq("blocked_info", null);

    if (error) throw new Error(error.message);

    const total = data.length;
    const high = data.filter((u) => u.blocked_info?.severity === "High").length;
    const medium = data.filter((u) => u.blocked_info?.severity === "Medium").length;
    const low = data.filter((u) => u.blocked_info?.severity === "Low").length;

    return { total, high, medium, low };
  },

  // ============================= REPORTS PAGE =============================

  async getReports() {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async createReport(reportData) {
    const { data, error } = await supabase
      .from("reports")
      .insert([reportData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async updateReport(reportId, updates) {
    const { data, error } = await supabase
      .from("reports")
      .update(updates)
      .eq("id", reportId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },


  async deleteReport(reportId) {
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);

    if (error) throw new Error(error.message);
    return { success: true };
  },

  async getReportStats() {
    const { data, error } = await supabase.from("reports").select("*");
    if (error) throw new Error(error.message);

    return {
      pending: data.filter(r => r.status === "Pending").length,
      underReview: data.filter(r => r.status === "Under Review").length,
      resolved: data.filter(r => r.status === "Resolved").length,
      critical: data.filter(r => r.priority === "Critical").length,
      thisWeek: data.filter(r => {
        const created = new Date(r.created_at);
        const now = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return created >= oneWeekAgo;
      }).length
    };
  },

  async getAdminUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, email")
      .eq("role", "admin");

    if (error) throw new Error(error.message);
    return data;
  },

  // ============================= DASHBOARD PAGE =============================

  async getAnnouncements() {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async addAnnouncement({ action, info, user, severity }) {
    const { data, error } = await supabase
      .from("announcements")
      .insert([
        { action, info, user, severity }
      ])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateAnnouncement(id, { action, info, severity }) {
    const { data, error } = await supabase
      .from("announcements")
      .update({ action, info, severity })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteAnnouncement(id) {
    const { data, error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getDashboardStats() {
    const { count: totalUsersCount, error: usersError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("active", true);

    if (usersError) throw new Error(usersError.message);

    const { count: blockedUsersCount, error: blockedError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("active", false);

    if (blockedError) throw new Error(blockedError.message);

    const { count: pendingReportsCount, error: reportsError } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "Pending");

    if (reportsError) throw new Error(reportsError.message);

    return {
      totalUsers: totalUsersCount,
      blockedUsers: blockedUsersCount,
      pendingReports: pendingReportsCount
    };
  },

};

module.exports = adminService;
