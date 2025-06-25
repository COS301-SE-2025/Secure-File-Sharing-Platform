/* global process */
const axios = require("axios");
require("dotenv").config();

exports.getNotifications = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            error: "User email is required"
        });
    }

    try {
        // First get the userId from the email
        const userResponse = await axios.get(
            `${process.env.API_URL || "http://localhost:5000"}/api/users/getUserId/${email}`
        );

        if (!userResponse.data.success || !userResponse.data.data.id) {
            return res.status(404).json({
                success: false,
                error: "User not found for the provided email"
            });
        }

        const userId = userResponse.data.data.id;

        // Now fetch notifications using the userId
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
    const { type, from, to, file_name, file_id, message } = req.body;

    if (!type || !from || !to || !file_name || !file_id) {
        return res.status(400).json({
            success: false,
            error: "Missing required fields: type, from, to, file_name, file_id"
        });
    }

    try {
        const response = await axios.post(
            `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/addNotification`,
            { type, from, to, file_name, file_id, message },
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

