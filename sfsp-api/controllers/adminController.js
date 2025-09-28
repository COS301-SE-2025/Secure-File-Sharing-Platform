// controllers/adminController.js
const adminService = require("../services/adminService");

const adminController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required.",
        });
      }

      const result = await adminService.login({ email, password });

      res.status(200).json({
        success: true,
        message: "Admin login successful",
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  },

  async sendVerification(req, res) {
    try {
      const { userId, email, username } = req.body;
      const result = await adminService.sendVerificationCode(userId, email, username);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async verifyOtp(req, res) {
    try {
      const { userId, code } = req.body;
      const result = await adminService.verifyCode(userId, code);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ============================= USERS PAGE =============================

  async sendMessage(req, res) {
    try {
      const { userId, email, username, subject, message } = req.body;

      if (!userId || !email || !username || !subject || !message) {
        return res.status(400).json({ success: false, message: "All fields are required." });
      }

      const result = await adminService.sendMessage(userId, email, username, subject, message);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getUserCount(req, res) {
    try {
      const counts = await adminService.getUserCount();
      res.status(200).json({
        success: true,
        ...counts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async getAllUsers(req, res) {
    try {
      const users = await adminService.getAllUsers();
      res.status(200).json({
        success: true,
        users,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async updateUserRole(req, res) {
    try {
      const { userId, newRole } = req.body;

      if (!userId || !newRole) {
        return res.status(400).json({
          success: false,
          message: "userId and newRole are required",
        });
      }

      const updatedUser = await adminService.updateUserRole(userId, newRole);

      res.status(200).json({
        success: true,
        message: `User role updated to ${newRole}`,
        user: updatedUser,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createAdmin(req, res) {
    try {
      const { username, email } = req.body;

      if (!username || !email) {
        return res.status(400).json({
          success: false,
          message: "Username and email are required.",
        });
      }

      const user = await adminService.createAdmin({ username, email });

      res.status(200).json({
        success: true,
        message: `${user.username} has been granted admin privileges`,
        user,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async blockUser(req, res) {
    try {
      const { userId, reason, severity, blockedBy } = req.body;

      if (!userId || !reason || !severity || !blockedBy) {
        return res.status(400).json({
          success: false,
          message: "userId, reason, severity, and blockedBy are required",
        });
      }

      const blockedInfo = {
        reason,
        severity,
        blocked_date: new Date().toISOString(),
        blocked_by: blockedBy,
      };

      const blockedUser = await adminService.blockUser(userId, blockedInfo);

      res.status(200).json({
        success: true,
        message: `User ${blockedUser.username} has been blocked`,
        user: blockedUser,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteUser(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      const deletedUser = await adminService.deleteUser(userId);

      res.status(200).json({
        success: true,
        message: `User ${deletedUser.username} has been deleted`,
        user: deletedUser,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ============================= BLOCKED USERS PAGE =============================

  async getBlockedUsers(req, res) {
    try {
      const users = await adminService.getBlockedUsers();
      res.status(200).json({ success: true, users });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async unblockUser(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, message: "userId is required" });
      }

      const updatedUser = await adminService.unblockUser(userId);

      res.status(200).json({
        success: true,
        message: `User ${updatedUser.username} has been unblocked`,
        user: updatedUser,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getBlockedStats(req, res) {
    try {
      const stats = await adminService.getBlockedStats();
      res.status(200).json({ success: true, ...stats });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ============================= REPORTS PAGE =============================

  async getReports(req, res) {
    try {
      const reports = await adminService.getReports();
      res.status(200).json({ success: true, data: reports });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async createReport(req, res) {
    try {
      const report = await adminService.createReport(req.body);
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateReport(req, res) {
    try {
      const { id } = req.params;
      const updatedReport = await adminService.updateReport(id, req.body);
      res.status(200).json({ success: true, data: updatedReport });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteReport(req, res) {
    try {
      const { id } = req.params;
      await adminService.deleteReport(id);
      res.status(200).json({ success: true, message: "Report deleted" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getReportStats(req, res) {
    try {
      const stats = await adminService.getReportStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getAdminUsers(req, res) {
    try {
      const users = await adminService.getAdminUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ============================= DASHBOARD PAGE =============================

  async getAnnouncements(req, res) {
    try {
      const announcements = await adminService.getAnnouncements();
      res.status(200).json({ success: true, announcements });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async addAnnouncement(req, res) {
    try {
      const { action, info, severity, user } = req.body;
      if (!action || !info || !severity || !user) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      const announcement = await adminService.addAnnouncement({ action, info, severity, user });
      res.status(201).json({ success: true, announcement });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const { action, info, severity } = req.body;
      const announcement = await adminService.updateAnnouncement(id, { action, info, severity });
      res.status(200).json({ success: true, announcement });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const announcement = await adminService.deleteAnnouncement(id);
      res.status(200).json({ success: true, announcement });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getDashboardStats(req, res) {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },


};

module.exports = adminController;
