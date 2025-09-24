// controllers/emailNotificationController.js
const notificationService = require('../services/notificationService');

class EmailNotificationController {
    async checkStorageAlert(req, res) {
        try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        // For now, we'll use placeholder values
        await notificationService.checkAndSendStorageAlert(userId, 0, 0);

        res.status(200).json({ message: 'Storage alert check completed' });
        } catch (error) {
        console.error('Error in checkStorageAlert:', error);
        res.status(500).json({ error: 'Failed to check storage alert' });
        }
    }

  // Trigger large deletion alert
    async checkLargeDeletionAlert(req, res) {
        try {
        const { userId, deletedFiles } = req.body;

        if (!userId || !deletedFiles) {
            return res.status(400).json({ error: 'User ID and deleted files are required' });
        }

        await notificationService.checkAndSendLargeDeletionAlert(userId, deletedFiles);

        res.status(200).json({ message: 'Large deletion alert check completed' });
        } catch (error) {
        console.error('Error in checkLargeDeletionAlert:', error);
        res.status(500).json({ error: 'Failed to check large deletion alert' });
        }
    }

  // Trigger new browser sign-in alert
    async sendNewBrowserSignInAlert(req, res) {
        try {
        const { userId, browserInfo, location, ipAddress } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        await notificationService.sendNewBrowserSignInAlert(
            userId,
            browserInfo,
            location,
            ipAddress
        );

        res.status(200).json({ message: 'New browser sign-in alert sent' });
        } catch (error) {
        console.error('Error in sendNewBrowserSignInAlert:', error);
        res.status(500).json({ error: 'Failed to send new browser sign-in alert' });
        }
    }

  // Trigger new device linked alert
    async sendNewDeviceLinkedAlert(req, res) {
        try {
        const { userId, deviceInfo, deviceType } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        await notificationService.sendNewDeviceLinkedAlert(
            userId,
            deviceInfo,
            deviceType
        );

        res.status(200).json({ message: 'New device linked alert sent' });
        } catch (error) {
        console.error('Error in sendNewDeviceLinkedAlert:', error);
        res.status(500).json({ error: 'Failed to send new device linked alert' });
        }
    }

  // Trigger new app connected alert
    async sendNewAppConnectedAlert(req, res) {
        try {
        const { userId, appName, permissions } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        await notificationService.sendNewAppConnectedAlert(
            userId,
            appName,
            permissions
        );

        res.status(200).json({ message: 'New app connected alert sent' });
        } catch (error) {
        console.error('Error in sendNewAppConnectedAlert:', error);
        res.status(500).json({ error: 'Failed to send new app connected alert' });
        }
    }

  // Send weekly digest manually (for testing)
    async sendWeeklyDigest(req, res) {
        try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        await notificationService.sendWeeklySharedFolderDigest(userId);

        res.status(200).json({ message: 'Weekly digest sent' });
        } catch (error) {
        console.error('Error in sendWeeklyDigest:', error);
        res.status(500).json({ error: 'Failed to send weekly digest' });
        }
    }

  // Send weekly digests to all users (for cron job)
    async sendAllWeeklyDigests(req, res) {
        try {
        await notificationService.sendAllWeeklyDigests();

        res.status(200).json({ message: 'Weekly digests sent to all users' });
        } catch (error) {
        console.error('Error in sendAllWeeklyDigests:', error);
        res.status(500).json({ error: 'Failed to send weekly digests' });
        }
    }
}

module.exports = new EmailNotificationController();
