/* global process */
const axios = require("axios");
require("dotenv").config();
const multer = require("multer");
const FormData = require('form-data')

const upload = multer();

exports.downloadFile = async (req, res) => {
  const { userId, fileId } = req.body;

  if (!userId || !fileId) {
    return res.status(400).send("Missing userId or fileId");
  }

  try {
    const response = await axios({
      method: "post",
      url: `${process.env.FILE_SERVICE_URL || "http://localhost:8081"
        }/download`,
      data: { userId, fileId },
      responseType: "arraybuffer",
      headers: { "Content-Type": "application/json" },
    });

    const fileName = response.headers["x-file-name"];
    const nonce = response.headers["x-nonce"];

    if (!fileName || !nonce) {
      console.error("Missing x-file-name or x-nonce headers from Go service");
      return res
        .status(500)
        .send("Missing required file metadata from service");
    }

    console.log(
      "Streaming binary back to client:",
      fileName,
      "length:",
      response.data.length
    );

    res.set({
      "Access-Control-Expose-Headers": "X-File-Name, X-Nonce",
      "Content-Type": "application/octet-stream",
      "X-File-Name": fileName,
      "X-Nonce": nonce,
    });

    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error("Download error:", err.message);
    return res.status(500).send("Download failed");
  }
};

exports.getMetaData = async (req, res) => {
  const userId = req.body.userId;
  console.log("📦 Received metadata request:", req.body);

  if (!userId) {
    return res.status(400).send("User ID is required");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/metadata`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error retrieving metadata");
    }

    const metadataList = response.data;
    res.json(metadataList);
  } catch (err) {
    console.log("User ID:", userId);
    console.error("Error retrieving metadata:", err.message);
    res.status(500).send("Error retrieving metadata");
  }
};

exports.uploadFile = [
  upload.single("encryptedFile"),
  async (req, res) => {
    try {
      const {
        fileName,
        fileType,
        userId,
        nonce,
        fileDescription,
        fileTags,
        path: uploadPath,
      } = req.body;

      if (!fileName || !req.file?.buffer) {
        return res.status(400).send("Missing file name or file content");
      }

      if (!userId || !nonce) {
        return res.status(400).send("Missing userId or nonce");
      }

      const formData = new FormData();
      formData.append("fileName", fileName);
      formData.append("fileType", fileType);
      formData.append("userId", userId);
      formData.append("nonce", nonce);
      formData.append("fileDescription", fileDescription);
      formData.append("fileTags", fileTags);
      formData.append("path", uploadPath || "files");
      formData.append("encryptedFile", req.file.buffer, fileName);

      const response = await axios.post(
        `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/upload`,
        formData,
        { headers: formData.getHeaders() } // 👈 important
      );

      res.status(201).json({
        message: "File uploaded",
        server: response.data,
      });
    } catch (err) {
      console.error("Upload error:", err.message);
      res.status(500).send("Upload failed");
    }
  },
];

exports.getNumberOfFiles = async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).send("User ID is required");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/getNumberOfFiles`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error retrieving file count");
    }

    const fileCount = response.data;
    res.json({ fileCount });
  } catch (err) {
    console.error("Error retrieving file count:", err.message);
    res.status(500).send("Error retrieving file count");
  }
};

exports.deleteFile = async (req, res) => {
  const { fileId, userId } = req.body;

  if (!fileId) {
    return res.status(400).send("FileId not received");
  }

  if (!userId) {
    return res.status(400).send("UserId not found");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/deleteFile`,
      { fileId, userId },
      { fileId, userId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error deleting file");
    }
    res.status(200).send("File deleted successfully");
  } catch (err) {
    console.error("Error deleting file:", err.message);
    res.status(500).send("Error deleting file");
  }
};

exports.sendFile = [
  upload.single("encryptedFile"),
  async (req, res) => {
    try {
      const { fileid, userId, recipientUserId, metadata } = req.body;
      const encryptedFile = req.file?.buffer;

      if (!fileid || !userId || !recipientUserId || !encryptedFile) {
        return res
          .status(400)
          .send("Missing file id, user ids or encrypted file");
      }

      const formData = new FormData();
      formData.append("fileid", fileid);
      formData.append("userId", userId);
      formData.append("recipientUserId", recipientUserId);
      formData.append("metadata", metadata); // JSON string
      formData.append("encryptedFile", encryptedFile, {
        filename: "encrypted.bin",
        contentType: "application/octet-stream",
      });

      const goResponse = await axios.post(
        `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/sendFile`,
        formData,
        { headers: formData.getHeaders() }
      );

      // ✅ Forward the receivedFileID from Go response
      const { receivedFileID, message } = goResponse.data;

      res.status(200).json({
        message: message || "File sent successfully",
        receivedFileID, // ✅ Frontend can now reference the correct file
      });
    } catch (err) {
      console.error("Error sending file:", err.message);
      res.status(500).send("Failed to send file");
    }
  },
];

exports.addAccesslog = async (req, res) => {
  const { file_id, user_id, action, message } = req.body;
  if (!file_id || !user_id || !action || !message) {
    return res
      .status(400)
      .send("Missing required fields: file_id, user_id, action or message");
  }
  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/addAccesslog`,
      { file_id, user_id, action, message },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error("Add access log error:", err.message);
    res.status(500).send("Failed to add access log");
  }
};

exports.getAccesslog = async (req, res) => {
  const { file_id } = req.body;
  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/getAccesslog`,
      file_id ? { file_id } : {},
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Get access log error:", err.message);
    res.status(500).send("Failed to get access log");
  }
};

exports.addTags = async (req, res) => {
  const { fileId, tags } = req.body;
  if (!fileId || !tags) {
    return res.status(400).send("Missing required fields: fileId or tags");
  }
  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/addTags`,
      { fileId, tags },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error("Add Tags error:", err.message);
    res.status(500).send("Failed to add tags to the file");
  }
};

exports.addUserToTable = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).send("Missing UserId");
  }
  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/addUser`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error("Add Users error:", err.message);
    res.status(500).send("Failed to add Users to the Table");
  }
};

exports.softDeleteFile = async (req, res) => {
  const { fileId } = req.body;
  if (!fileId) {
    return res.status(400).send("Missing fileId");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/softDeleteFile`,
      { fileId },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Soft delete error:", err.message);
    res.status(500).send("Failed to soft delete file"); // <-- match test expectation
  }
};

exports.restoreFile = async (req, res) => {
  const { fileId } = req.body;
  if (!fileId) {
    return res.status(400).send("Missing fileId");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/restoreFile`,
      { fileId },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Restore error:", err.message);
    res.status(500).send("Restore failed");
  }
};

exports.removeFileTags = async (req, res) => {
  const { fileId, tags } = req.body;
  if (!fileId || !tags) {
    return res.status(400).send("Missing required fields: fileId or tags");
  }
  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/removeTags`,
      { fileId, tags },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error("remove Tags error:", err.message);
    res.status(500).send("Failed to remove tags to the file");
  }
};

exports.downloadSentFile = async (req, res) => {
  const filepath = req.body.filepath;

  if (!filepath) {
    return res.status(400).send("file path is required");
  }

  try {
    const response = await axios({
      method: "post",
      url: `${process.env.FILE_SERVICE_URL || "http://localhost:8081"
        }/downloadSentFile`,
      data: { filepath },
      responseType: "arraybuffer", // ⭐ CRITICAL to handle binary
      headers: { "Content-Type": "application/json" },
    });

    console.log(
      "Downloaded sent file from Go:",
      filepath,
      "length:",
      response.data.length
    );

    // pass binary directly to client
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Length": response.data.length,
    });

    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error("Error retrieving the sent file:", err.message);
    res.status(500).send("Error retrieving the sent file");
  }
};

exports.addDescription = async (req, res) => {
  const { fileId, description } = req.body;

  if (!fileId || !description) {
    return res.status(400).send("Missing fileId or description");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/addDescription`,
      { fileId, description },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error("Add description error:", err.message);
    res.status(500).send("Failed to add description to the file");
  }
};

exports.createFolder = async (req, res) => {
  const { userId, folderName, parentPath, description } = req.body;

  if (!userId || !folderName) {
    return res.status(400).send("Missing userId or folderName");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/createFolder`,
      { userId, folderName, parentPath, description },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Create folder error:", err.message);
    res.status(500).send("Failed to create folder");
  }
};

exports.updateFilePath = async (req, res) => {
  const { fileId, newPath } = req.body;

  if (!fileId || !newPath) {
    return res.status(400).send("Missing fileId or newPath");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/updateFilePath`,
      { fileId, newPath },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Update file path error:", err.message);
    res.status(500).send("Failed to update file path");
  }
};

exports.sendByView = [
  upload.single("encryptedFile"),
  async (req, res) => {
    try {
      const { fileid, userId, recipientUserId, metadata } = req.body;
      const encryptedFile = req.file?.buffer;

      if (!fileid || !userId || !recipientUserId || !encryptedFile) {
        return res
          .status(400)
          .send("Missing file id, user ids or encrypted file");
      }

      const formData = new FormData();
      formData.append("fileid", fileid);
      formData.append("userId", userId);
      formData.append("recipientUserId", recipientUserId);
      formData.append("metadata", metadata);
      formData.append("encryptedFile", encryptedFile, {
        filename: "encrypted.bin",
        contentType: "application/octet-stream",
      });

      const response = await axios.post(
        `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/sendByView`,
        formData,
        { headers: formData.getHeaders() }
      );

      if (response.status !== 200) {
        return res.status(response.status).send("Error from Go service");
      }

      // Forward the shareId from the Go service response
      const { shareId, message } = response.data;

      res.status(200).json({
        message: message || "File sent successfully for view-only access",
        shareId
      });
    } catch (err) {
      console.error("Error sending file by view:", err.message);
      res.status(500).send("Failed to send file by view");
    }
  }
];

exports.getSharedViewFiles = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).send("Missing userId");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/getSharedViewFiles`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error retrieving shared view files");
    }

    res.status(200).json(response.data);
  } catch (err) {
    console.error("Error retrieving shared view files:", err.message);
    res.status(500).send("Error retrieving shared view files");
  }
};

exports.getViewFileAccessLogs = async (req, res) => {
  const { fileId, userId } = req.body;

  if (!fileId || !userId) {
    return res.status(400).send("Missing fileId or userId");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/getViewFileAccessLogs`,
      { fileId, userId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error retrieving view file access logs");
    }
    res.status(200).json(response.data);
  } catch (err) {
    console.error("Error retrieving view file access logs:", err.message);
    res.status(500).send("Error retrieving view file access logs");
  }
};

exports.revokeViewAccess = async (req, res) => {
  const { fileId, userId, recipientId } = req.body;

  if (!fileId || !userId || !recipientId) {
    return res.status(400).send("Missing fileId, userId or recipientId");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/revokeViewAccess`,
      { fileId, userId, recipientId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error revoking view access");
    }
    res.json({ message: "View access revoked successfully" });
  } catch (err) {
    console.error("Error revoking view access:", err.message);
    res.status(500).send("Error revoking view access");
  }
};

exports.downloadViewFile = async (req, res) => {
  const { userId, fileId } = req.body;

  if (!userId || !fileId) {
    return res.status(400).send("Missing userId, fileId");
  }

  try {
    const response = await axios({
      method: "post",
      url: `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/downloadViewFile`,
      data: { userId, fileId },
      responseType: "arraybuffer",
      headers: { "Content-Type": "application/json" },
    });

    // Forward the headers from the Go service
    const viewOnly = response.headers["x-view-only"];
    const fileIdHeader = response.headers["x-file-id"];
    const shareIdHeader = response.headers["x-share-id"];

    res.set({
      "Content-Type": "application/octet-stream",
      "X-View-Only": viewOnly,
      "X-File-Id": fileIdHeader,
      "X-Share-Id": shareIdHeader,
    });

    console.log(
      "Streaming view file back to client:",
      "fileId:",
      fileId,
      "shareId:",
      shareIdHeader,
      "length:",
      response.data.length
    );

    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error("Download view file error:", err.message);
    if (err.response && err.response.status === 403) {
      return res.status(403).send("Access has been revoked or expired");
    }
    return res.status(500).send("Download view file failed");
  }
};
