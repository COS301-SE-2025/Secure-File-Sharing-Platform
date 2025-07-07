/* global process */
const axios = require("axios");
require("dotenv").config();

exports.getNotifications = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            error: "User ID is required"
        });
    }

    try {
        const response = await axios.get(
            `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/notifications`,
            {
                params: { id: userId },
                headers: { "Content-Type": "application/json" }
            }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error("Get notifications error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to fetch notifications"
        });
    }
};

exports.markAsRead = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: "Notification ID is required"
        });
    }

    try {
        const response = await axios.post(
            `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/notifications/markAsRead`,
            { id },
            { headers: { "Content-Type": "application/json" } }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error("Mark as read error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to mark notification as read"
        });
    }
};

exports.respondToShareRequest = async (req, res) => {
    const { id, status } = req.body;

    if (!id || !status) {
        return res.status(400).json({
            success: false,
            error: "Notification ID and status are required"
        });
    }

    if (status !== "accepted" && status !== "declined") {
        return res.status(400).json({
            success: false,
            error: "Status must be 'accepted' or 'declined'"
        });
    }

    try {
        const response = await axios.post(
            `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/notifications/respond`,
            { id, status },
            { headers: { "Content-Type": "application/json" } }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error("Respond to share request error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to update share request status"
        });
    }
};

exports.clearNotification = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: "Notification ID is required"
        });
    }

    try {
        const response = await axios.post(
            `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/notifications/clear`,
            { id },
            { headers: { "Content-Type": "application/json" } }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error("Clear notification error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to clear notification"
        });
    }
};

exports.addNotification = async (req, res) => {
    const { type, fromEmail, toEmail, file_name, file_id, message } = req.body;

    if (!type || !fromEmail || !toEmail || !file_name || !file_id) {
        return res.status(400).json({
            success: false,
            error: "Missing required fields: type, fromEmail, toEmail, file_name, file_id"
        });
    }

    try {
        let senderResponse;
        try {
            senderResponse = await axios.get(
                `${process.env.API_URL || "http://localhost:5000"}/api/users/getUserId/${fromEmail}`
            );

            if (!senderResponse.data.success || !senderResponse.data.data.id) {
                return res.status(404).json({
                    success: false,
                    error: `Sender with email ${fromEmail} not found`
                });
            }
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: `Sender with email ${fromEmail} not found`
            });
        }

        let recipientResponse;
        try {
            recipientResponse = await axios.get(
                `${process.env.API_URL || "http://localhost:5000"}/api/users/getUserId/${toEmail}`
            );

            if (!recipientResponse.data.success || !recipientResponse.data.data.id) {
                return res.status(404).json({
                    success: false,
                    error: `Recipient with email ${toEmail} not found`
                });
            }
        } catch (error) {
            return res.status(404).json({
                success: false,
                error: `Recipient with email ${toEmail} not found`
            });
        }

        const fromId = senderResponse.data.data.id;
        const toId = recipientResponse.data.data.id;
        const response = await axios.post(
            `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/notifications/add`,
            {
                type,
                from: fromId,
                to: toId,
                file_name,
                file_id,
                message
            },
            { headers: { "Content-Type": "application/json" } }
        );

        res.status(201).json(response.data);
    } catch (err) {
        console.error("Add notification error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to add notification"
        });
    }
};
