// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// ============================= AUTH PAGE =============================

router.post("/login", adminController.login);
router.post("/send-verification",  adminController.sendVerification);
router.post("/verify-code",  adminController.verifyOtp);


// ============================= USERS PAGE =============================

router.get("/users/count", adminController.getUserCount);
router.get("/users", adminController.getAllUsers);
router.post("/users/role", adminController.updateUserRole);
router.post("/users/create", adminController.createAdmin);
router.post("/users/block", adminController.blockUser);
router.post("/users/delete", adminController.deleteUser);
router.post("/send-message", adminController.sendMessage);

// ============================= BLOCKED USERS PAGE =============================

router.get("/users/blocked", adminController.getBlockedUsers);
router.post("/users/unblock", adminController.unblockUser);
router.get("/users/blocked/stats", adminController.getBlockedStats);

// ============================= REPORTS PAGE =============================

router.get("/reports", adminController.getReports);
router.post("/reports", adminController.createReport);
router.put("/reports/:id", adminController.updateReport);
router.delete("/reports/:id", adminController.deleteReport);
router.get("/report-stats", adminController.getReportStats);
router.get("/assignees", adminController.getAdminUsers);

// ============================= DASHBOARD PAGE =============================

router.get("/announcements", adminController.getAnnouncements);       
router.post("/announcements", adminController.addAnnouncement);       
router.put("/announcements/:id", adminController.updateAnnouncement);   
router.delete("/announcements/:id", adminController.deleteAnnouncement); 
router.get("/dashboard/stats", adminController.getDashboardStats);

module.exports = router;
