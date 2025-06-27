/* global process */
const axios = require("axios");
require("dotenv").config();

exports.downloadFile = async (req, res) => {
  const { userId, filename } = req.body;

  if (!userId || !filename) {
    return res.status(400).send("Missing path or filename"); // if test is right

  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/download`,
      { userId, filename },
      { headers: { "Content-Type": "application/json" } }
    );

    const { fileName, fileContent, nonce } = response.data;


    res.json({ fileName, fileContent, nonce });
  } catch (err) {
    console.error("Download error:", err.message);
    return res.status(500).send("Download failed");

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
      fileContent,
    } = req.body;

    if (!fileName || !fileContent) {
      return res.status(400).send("Missing file name or file content");
    }

    if (!userId) {
      return res.status(400).send("Missing userId");
    }

    if (!nonce) {
      return res.status(400).send("Missing nonce");
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
      fileContent,
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
  const {fileId, userId} = req.body;

  if (!fileId) {
    return res.status(400).send("FileId not received");
  }

  if(!userId){
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

exports.sendFile = async (req, res) => {
  const {
    fileid,
    userId,
    recipientUserId,
    encryptedFile,
    encryptedAesKey,
    ekPublicKey,
    metadata,
  } = req.body;

  // Basic validation
  if (!fileid) return res.status(400).send("File ID is missing");
  if (!userId || !recipientUserId)
    return res.status(400).send("User ID or Recipient User ID is missing");
  if (!encryptedFile || !encryptedAesKey)
    return res.status(400).send("Encrypted file or AES key is missing");

  // Validate metadata fields
  if (
    !metadata ||
    !metadata.fileNonce ||
    !metadata.keyNonce ||
    !metadata.ikPublicKey ||
    !metadata.ekPublicKey ||
    !metadata.opk_id
  ) {
    return res
      .status(400)
      .send("Metadata is incomplete or missing required keys");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/sendFile`,
      {
        fileid,
        userId,
        recipientUserId,
        encryptedFile,
        encryptedAesKey,
        ekPublicKey,
        metadata, // send entire metadata map to Go
      },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error sending file");
    }

    return res.status(200).json({ message: "File sent successfully" });
  } catch (err) {
    console.error("Error sending file:", err.message);
    return res.status(500).send("Failed to send file");
  }
};

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
    return res
      .status(400)
      .send("Missing required fields: fileId or tags");
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
}

exports.addUserToTable = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res
      .status(400)
      .send("Missing UserId");
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
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/softDeleteFile`,
      { fileId },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).json(response.data);
  }
  catch (err) {
    console.error("Soft delete error:", err.message);
    res.status(500).send("Failed to soft delete file");  // <-- match test expectation
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
    return res
      .status(400)
      .send("Missing required fields: fileId or tags");
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
}

exports.downloadSentFile = async (req, res) => {
  const filepath = req.body.filepath;

  if (!filepath) {
    return res.status(400).send("file path is required");
  }

  try {
    const response = await axios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/downloadSentFile`,
      { filepath },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error retrieving the sent file");
    }

    const metadataList = response.data;
    res.json(metadataList);
  } catch (err) {
    console.log("FilePath: ", filepath);
    console.error("Error retrieving the sent file:", err.message);
    res.status(500).send("Error retrieving the sent file");
  }
}


