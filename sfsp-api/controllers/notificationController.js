/* global process */
const axios = require("axios");
require("dotenv").config();

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

function sanitizeEmail(email) {
    return email.replace(/[<>\"'`\s\n\r\t]/g, '');
}

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
  console.log("I am in add notifications");
  const body = req.body || {};
  const { type, fromEmail, toEmail, file_name, file_id, message, receivedFileID, viewOnly } = body;
  console.log("FromEmail is: ", fromEmail);
  console.log("toEmail is: ", toEmail);

  if (!type || !fromEmail || !toEmail || !file_name || !file_id) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: type, fromEmail, toEmail, file_name, file_id"
    });
  }

  if (!isValidEmail(fromEmail) || !isValidEmail(toEmail)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email format"
    });
  }

  const extractId = (resp) =>
    resp?.data?.data?.id ?? resp?.data?.data?.userId ?? null;

  console.log("Sanitized FromEmail is: ", sanitizeEmail(fromEmail));
  try {
    let senderResponse;
    try {
      console.log("API URL is:", process.env.API_URL || "http://localhost:5000");
      senderResponse = await axios.get(
        `${process.env.API_URL || "http://localhost:5000"}/api/users/getUserId/${encodeURIComponent(sanitizeEmail(fromEmail))}`
      );
      console.log("Sender response:", senderResponse.data);
      const fromId = extractId(senderResponse);
      if (!senderResponse.data.success || !fromId) {
        console.log(`Sender with email ${fromEmail} not found`);
        return res.status(404).json({ success: false, error: `Sender with email ${fromEmail} not found` });
      }

      console.log("UserID: Sanitized ToEmail is: ", sanitizeEmail(toEmail));
      let recipientResponse = await axios.get(
        `${process.env.API_URL || "http://localhost:5000"}/api/users/getUserId/${encodeURIComponent(sanitizeEmail(toEmail))}`
      );
      console.log("Recipient response:", recipientResponse.data);
      const toId = extractId(recipientResponse);
      if (!recipientResponse.data.success || !toId) {
        return res.status(404).json({ success: false, error: `Recipient with email ${toEmail} not found` });
      }

      const response = await axios.post(
        `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/notifications/add`,
        { type, from: fromId, to: toId, file_name, file_id, message, receivedFileID, viewOnly },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Response from notification service:", response.data);
      return res.status(201).json(response.data);
    } catch (e) {
      if (e.response?.status === 404) {
        return res.status(404).json({ success: false, error: e.response.data?.error || "User not found" });
      }
      throw e;
    }
  } catch (err) {
    console.error("Add notification error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to add notification" });
  }
};
