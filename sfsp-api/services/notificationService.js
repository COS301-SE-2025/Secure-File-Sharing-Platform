// services/notificationService.js
const userService = require('./userService');
const { supabase } = require('../config/database');

class NotificationService {
    async checkAndSendStorageAlert(userId, currentUsage, totalSpace) {
        try {
        const user = await userService.getUserById(userId);
        const usagePercentage = (currentUsage / totalSpace) * 100;

        if (usagePercentage >= 80) {
            await userService.sendStorageAlertEmail(
            userId,
            user.email,
            user.username,
            currentUsage,
            totalSpace
            );
        }
        } catch (error) {
        console.error('Error checking storage alert:', error);
        }
    }

  // Large file deletion alert - triggered when multiple files are deleted
    async checkAndSendLargeDeletionAlert(userId, deletedFiles) {
        try {
        const user = await userService.getUserById(userId);

        // Count files and calculate total size
        const fileCount = deletedFiles.length;
        const totalSize = deletedFiles.reduce((sum, file) => sum + (file.size || 0), 0);

        // Send alert if more than 10 files or total size > 1GB
        if (fileCount >= 10 || totalSize > 1024 * 1024 * 1024) {
            await userService.sendLargeFileDeletionEmail(
            userId,
            user.email,
            user.username,
            fileCount,
            totalSize
            );
        }
        } catch (error) {
        console.error('Error checking large deletion alert:', error);
        }
    }

  // New browser sign-in alert
    async sendNewBrowserSignInAlert(userId, browserInfo, location, ipAddress) {
        try {
        const user = await userService.getUserById(userId);
        const resolvedLocation = location instanceof Promise ? await location : location;
        await userService.sendNewBrowserSignInEmail(
            userId,
            user.email,
            user.username,
            browserInfo,
            resolvedLocation,
            ipAddress
        );
        } catch (error) {
        console.error('Error sending new browser sign-in alert:', error);
        }
    }

  // New device linked alert
    async sendNewDeviceLinkedAlert(userId, deviceInfo, deviceType) {
        try {
        const user = await userService.getUserById(userId);
        await userService.sendNewDeviceLinkedEmail(
            userId,
            user.email,
            user.username,
            deviceInfo,
            deviceType
        );
        } catch (error) {
        console.error('Error sending new device linked alert:', error);
        }
    }

  // New app connected alert
    async sendNewAppConnectedAlert(userId, appName, permissions) {
        try {
        const user = await userService.getUserById(userId);
        await userService.sendNewAppConnectedEmail(
            userId,
            user.email,
            user.username,
            appName,
            permissions
        );
        } catch (error) {
        console.error('Error sending new app connected alert:', error);
        }
    }

  // Weekly shared folder digest
    async sendWeeklySharedFolderDigest(userId) {
        try {
        const user = await userService.getUserById(userId);

        // Get activities from the last week
        const { data: activities, error } = await supabase
            .from('file_logs')
            .select(`
            *,
            files:file_id (
                fileName
            )
            `)
            .eq('user_id', userId)
            .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Error fetching weekly activities:', error);
            return;
        }

        if (activities && activities.length > 0) {
            await userService.sendWeeklySharedFolderDigest(
            userId,
            user.email,
            user.username,
            activities
            );
        }
        } catch (error) {
        console.error('Error sending weekly shared folder digest:', error);
        }
    }

  // Schedule weekly digest (this would be called by a cron job or scheduler)
    async sendAllWeeklyDigests() {
        try {
        // Get all users who have shared folder activity notifications enabled
        const { data: users, error } = await supabase
            .from('users')
            .select('id')
            .not('notification_settings', 'is', null);

        if (error) {
            console.error('Error fetching users for weekly digest:', error);
            return;
        }

        for (const user of users) {
            const shouldSend = await userService.shouldSendEmail(
            user.id,
            'sharedFolderActivity',
            'files'
            );

            if (shouldSend) {
            await this.sendWeeklySharedFolderDigest(user.id);
            }
        }
        } catch (error) {
        console.error('Error sending weekly digests:', error);
        }
    }
}

module.exports = new NotificationService();
