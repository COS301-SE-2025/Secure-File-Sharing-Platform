const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

exports.downloadFile = async (req, res) => {
  const { path, filename } = req.body;

  if (!path || !filename) {
    return res.status(400).send("Missing path or filename");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/download`,
      { path, filename },
      { headers: { "Content-Type": "application/json" } }
    );

    const { fileName, fileContent } = response.data;

    res.json({ fileName, fileContent }); // ✅ Send as JSON
  } catch (err) {
    console.error("Download error:", err.message);
    res.status(500).send("Download failed");
  }
};

exports.getMetaData = async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).send('User ID is required');
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/metadata`,
      { userId }, // ✅ Send as JSON body
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send('Error retrieving metadata');
    }

    const metadataList = response.data;
    res.json(metadataList);
  } catch (err) {
    console.log("User ID:", userId);
    console.error("Error retrieving metadata:", err.message);
    res.status(500).send('Error retrieving metadata');
  }
};


exports.uploadFile = async (req, res) => {
  try {
    const {
      fileName,
      fileType,
      userId,
      encryptionKey,
      fileDescription,
      fileTags,
      path: uploadPath,
      fileContent, // base64 encoded string
    } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).send("Missing file name or file content");
    }

    console.log("📡 Uploading to:", process.env.FILE_SERVICE_URL);

    const payload = {
      fileName,
      fileType,
      userId,
      encryptionKey,
      uploadTimestamp: new Date().toISOString(),
      fileDescription,
      fileTags,
      path: uploadPath || "files",
      fileContent, // still base64
    };

    const response = await axios.post(`${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/upload`, payload, {
      headers: { "Content-Type": fileType}
    });

    res.status(201).json({
      message: " File uploaded",
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
    return res.status(400).send('User ID is required');
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/getNumberOfFiles`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send('Error retrieving file count');
    }

    const fileCount = response.data;
    res.json({ fileCount });
  } catch (err) {
    console.error("Error retrieving file count:", err.message);
    res.status(500).send('Error retrieving file count');
  }
};


exports.deleteFile = (req, res) => {

}

exports.getFileList = (req, res) => {

}