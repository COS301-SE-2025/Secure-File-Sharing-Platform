/* global process */
const axios = require("axios");
require("dotenv").config();

exports.downloadFile = async (req, res) => {
  const { userId, filename } = req.body;

  if (!userId || !filename) {
    return res.status(400).send("Missing userId or filename");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/download`,
      { userId, filename },
      { headers: { "Content-Type": "application/json" } }
    );

    const { fileName, fileContent, nonce } = response.data;

    res.json({ fileName, fileContent, nonce }); // ✅ Send as JSON
  } catch (err) {
    console.error("Download error:", err.message);
    res.status(500).send("Download failed");
  }
};

exports.getMetaData = async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).send("User ID is required");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/metadata`,
      { userId }, // ✅ Send as JSON body
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

exports.uploadFile = async (req, res) => {
  try {
    const {
      fileName,
      fileType,
      userId,
      nonce,
      fileDescription,
      fileTags,
      path: uploadPath,
      fileContent, // base64 encoded string
    } = req.body;

    if (!fileName) {
      return res.status(400).send("Missing file name");
    }

    if (!userId) {
      return res.status(400).send("Missing userId");
    }

    if (!nonce) {
      return res.status(400).send("Missing nonce");
    }

    if (!fileContent) {
      return res.status(400).send("Missing file content");
    }

    console.log("📡 Uploading to:", process.env.FILE_SERVICE_URL);

    const payload = {
      fileName,
      fileType,
      userId,
      nonce,
      uploadTimestamp: new Date().toISOString(),
      fileDescription,
      fileTags,
      path: uploadPath || "files",
      fileContent, // still base64
    };

    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/upload`,
      payload,
      {
        headers: { "Content-Type": fileType },
      }
    );

    res.status(201).json({
      message: "File uploaded",
      server: response.data,
    });
  } catch (err) {
    console.error(" Upload error:", err.message);
    res.status(500).send("Upload failed");
  }
};

exports.getNumberOfFiles = async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).send("User ID is required");
  }

  try {
    const response = await axios.post(
      `${
        process.env.FILE_SERVICE_URL || "http://localhost:8081"
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
  const fileId = req.body.fileId;

  if (!fileId) {
    return res.status(400).send("FileId not received");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/deleteFile`,
      { fileId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error deleting file");
    }
  } catch (err) {
    console.error("Error retrieving file count:", err.message);
    res.status(500).send("Error retrieving file count");
  }
};

exports.sendFile = async (req, res) => {
  const {
    fileid,
    userId,
    recipientUserId,
    encryptedFile,
    fileNonce,
    keyNonce,
    encryptedAesKey,
    ikPublicKey,
    ekPublicKey,
    opk_id,
  } = req.body;

  if (!fileid) return res.status(400).send("File id is missing");
  if (!userId || !recipientUserId) return res.status(400).send("User id is missing or recipientUser Id is missing");
  if (!encryptedFile || !encryptedAesKey)
    return res.status(400).send("Encrypted file or AES key is missing");
  if (!fileNonce || !keyNonce)
    return res.status(400).send("File nonce or key nonce is missing");
  if (!ikPublicKey || !ekPublicKey || !opk_id)
    return res.status(400).send("IK, EK, or OPK ID is missing");

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/sendFile`,
      {
        fileid,
        userId,
        recipientUserId,
        encryptedFile,
        fileNonce,
        keyNonce,
        encryptedAesKey,
        ikPublicKey,
        ekPublicKey,
        opk_id,
      },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error sending file");
    }
}

exports.addAccesslog = async (req, res) => {
  const { file_id, user_id, action } = req.body;
  if (!file_id || !user_id || !action) {
    return res.status(400).send("Missing required fields: file_id, user_id, or action");
  }
  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/addAccesslog`,
      { file_id, user_id, action },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error("Add access log error:", err.message);
    res.status(500).send("Failed to add access log");
  }
};

exports.removeAccesslog = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).send("Missing log id");
  }
  try {
    const response = await axios.delete(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/removeAccesslog`,
      { params: { id } }
    );
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error("Remove access log error:", err.message);
    res.status(500).send("Failed to remove access log");
  }
};

exports.getAccesslog = async (req, res) => {
  const { file_id } = req.query;
  try {
    const response = await axios.get(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/getAccesslog`,
      { params: file_id ? { file_id } : {} }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Get access log error:", err.message);
    res.status(500).send("Failed to get access log");
    return res.status(200).json({ message: "File sent successfully" });
  } catch (err) {
    console.error("Error sending file:", err.message);
    res.status(500).send("Failed to send file");
  }
};