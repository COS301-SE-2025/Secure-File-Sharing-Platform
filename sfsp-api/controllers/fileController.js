const axios = require("axios");
require("dotenv").config();
const multer = require("multer");
const FormData = require("form-data");

const upload = multer({ storage: multer.memoryStorage() });

const fileServiceAxios = axios.create({
  baseURL: process.env.FILE_SERVICE_URL || "http://localhost:8081",
  timeout: 1800000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});


exports.downloadFile = async (req, res) => {
  const { userId, fileId } = req.body;

  if (!userId || !fileId) {
    return res.status(400).send("Missing userId or fileId");
  }

  try {
    const response = await fileServiceAxios({
      method: "post",
      url: `${
        process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/download`,
      data: { userId, fileId },
      headers: { "Content-Type": "application/json" },
      responseType: "stream", 
    });

    const fileName = response.headers["x-file-name"];
    const nonce = response.headers["x-nonce"];

	  console.log("fileName is: ", fileName);
	  console.log("Nounce is: ", nonce);

    if (!fileName || !nonce) {
      console.error("❌ Missing x-file-name or x-nonce headers from Go service");
      return res.status(500).send("Missing required file metadata from service");
    }

    console.log(
      "Streaming file to client:",
      fileName,
      "size unknown until complete"
    );

    res.set({
      "Access-Control-Expose-Headers": "X-File-Name, X-Nonce",
      "Content-Type": "application/octet-stream",
      "X-File-Name": fileName,
      "X-Nonce": nonce,
    });

    response.data.pipe(res);

    response.data.on("error", (err) => {
      console.error("Stream error from Go service:", err);
      res.end(); 
    });

    response.data.on("end", () => {
      console.log("File streamed to client successfully:", fileName);
    });

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
    const response = await fileServiceAxios.post(
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

exports.startUpload = async (req, res) => {
  try {
    const {
      fileName,
      fileType,
      userId,
      nonce,
      fileDescription,
      fileTags,
      path: folderPath,
    } = req.body;

    console.log("Inside startUpload:", req.body);

    if (!fileName || !userId) {
      return res.status(400).send("Missing fileName or userId");
    }

    let tagsArray = [];
    if (Array.isArray(fileTags)) {
      tagsArray = fileTags;
    } else if (typeof fileTags === "string" && fileTags.trim() !== "") {
      tagsArray = [fileTags];
    }

    const response = await fileServiceAxios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/startUpload`,
      {
        fileName,
        fileType: fileType || "",
        userId,
	nonce,
        fileDescription: fileDescription || "",
        fileTags: tagsArray,
        path: folderPath || "files",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    return res.status(response.status).json(response.data);
  } catch (err) {
    console.error("startUpload error:", err.message);
    res.status(500).send("Failed to start upload");
  }
};

exports.uploadChunk = async (req, res) => {
  try {
    const {
      fileName,
      fileType,
      userId,
      nonce,
      fileHash,
      fileDescription,
      fileTags,
      chunkIndex,
      totalChunks,
      fileId,         
      path: folderPath,
    } = req.body;

    if (!fileName || !req.file?.buffer) {
      return res.status(400).send("Missing file name or chunk data");
    }

    if (!userId || !nonce || !fileHash || !fileId) {
      return res.status(400).send("Missing userId, nonce, fileHash, or fileId");
    }

    let tagsValue = "[]";
    if (fileTags) {
      if (typeof fileTags === "string") {
        try {
          JSON.parse(fileTags);
          tagsValue = fileTags;
        } catch {
          tagsValue = JSON.stringify([fileTags]);
        }
      } else if (Array.isArray(fileTags)) {
        tagsValue = JSON.stringify(fileTags);
      }
    }

    const formData = new FormData();
    formData.append("fileId", fileId);                   
    formData.append("fileName", fileName);
    formData.append("fileType", fileType || "application/octet-stream");
    formData.append("userId", userId);
    formData.append("nonce", nonce);
    formData.append("fileHash", fileHash);
    formData.append("fileDescription", fileDescription || "");
    formData.append("fileTags", tagsValue);
    formData.append("chunkIndex", chunkIndex);
    formData.append("totalChunks", totalChunks);
    formData.append("path", folderPath || "files");
    formData.append("encryptedFile", req.file.buffer, { filename: fileName });

    const goResponse = await fileServiceAxios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/upload`,
      formData,
      { headers: formData.getHeaders(), maxBodyLength: Infinity }
    );

    return res.status(goResponse.status).json(goResponse.data);
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).send("Upload failed");
  }
};

exports.getNumberOfFiles = async (req, res) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).send("User ID is required");
  }

  try {
    const response = await fileServiceAxios.post(
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
  const { fileId, userId } = req.body;

  if (!fileId) {
    return res.status(400).send("FileId not received");
  }

  if (!userId) {
    return res.status(400).send("UserId not found");
  }

  try {
    const response = await fileServiceAxios.post(
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
      const {
        fileid,
        userId,
        recipientUserId,
        metadata,
        chunkIndex,
        totalChunks,
      } = req.body;
      const encryptedFile = req.file?.buffer;

      if (!fileid || !userId || !recipientUserId || !metadata || !encryptedFile) {
        return res.status(400).send("Missing required fields or file chunk");
      }

      const formData = new FormData();
      formData.append("fileid", fileid);
      formData.append("userId", userId);
      formData.append("recipientUserId", recipientUserId);
      formData.append("metadata", metadata);
      formData.append("chunkIndex", chunkIndex);
      formData.append("totalChunks", totalChunks);
      formData.append("encryptedFile", encryptedFile, {
        filename: `chunk_${chunkIndex}.bin`,
        contentType: "application/octet-stream",
      });

      const goResponse = await fileServiceAxios.post(
        `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/sendFile`,
        formData,
        {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity, 
        }
      );

      res.status(goResponse.status).json(goResponse.data);
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
    const response = await fileServiceAxios.post(
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
    const response = await fileServiceAxios.post(
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
    const response = await fileServiceAxios.post(
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
    const response = await fileServiceAxios.post(
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
    const response = await fileServiceAxios.post(
      `${
        process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/softDeleteFile`,
      { fileId },
      { headers: { "Content-Type": "application/json" } }
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("Soft delete error:", err.message);
    res.status(500).send("Failed to soft delete file"); 
  }
};

exports.restoreFile = async (req, res) => {
  const { fileId } = req.body;
  if (!fileId) {
    return res.status(400).send("Missing fileId");
  }

  try {
    const response = await fileServiceAxios.post(
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
    const response = await fileServiceAxios.post(
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
  const { filepath } = req.body;

  if (!filepath) {
    return res.status(400).send("File path is required");
  }

  try {
    const response = await fileServiceAxios({
      method: "post",
      url: `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/downloadSentFile`,
      data: { filePath: filepath },
      headers: { "Content-Type": "application/json" },
      responseType: "stream", 
    });

    res.set({
      "Content-Type": "application/octet-stream",
      "Access-Control-Expose-Headers": "Content-Disposition",
      "Content-Disposition": `attachment; filename="${filepath.split("/").pop()}"`,
    });

    // 🔹 3. Pipe Go backend stream → frontend
    response.data.pipe(res);

    // Optional logging
    response.data.on("end", () => {
      console.log(`✅ Finished streaming sent file: ${filepath}`);
    });

    response.data.on("error", (err) => {
      console.error("❌ Stream error from Go service:", err.message);
      res.end(); // Close client connection
    });

  } catch (err) {
    console.error("❌ Error retrieving sent file:", err.message);
    if (!res.headersSent) {
      res.status(500).send("Error retrieving the sent file");
    } else {
      res.end(); // Ensure connection closes
    }
  }
};

exports.addDescription = async (req, res) => {
  const { fileId, description } = req.body;

  if (!fileId || !description) {
    return res.status(400).send("Missing fileId or description");
  }

  try {
    const response = await fileServiceAxios.post(
      `${
        process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/addDescription`,
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
    const response = await fileServiceAxios.post(
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
    const response = await fileServiceAxios.post(
      `${
        process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/updateFilePath`,
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
      const {
        fileid,
        userId,
        recipientUserId,
        metadata,
        chunkIndex,
        totalChunks,
      } = req.body;
      const encryptedFile = req.file?.buffer;

      if (
        !fileid ||
        !userId ||
        !recipientUserId ||
        !metadata ||
        !encryptedFile
      ) {
        return res
          .status(400)
          .send("Missing file id, user ids, metadata, or encrypted file chunk");
      }

      const formData = new FormData();
      formData.append("fileid", fileid);
      formData.append("userId", userId);
      formData.append("recipientUserId", recipientUserId);
      formData.append("metadata", metadata);
      formData.append("chunkIndex", chunkIndex);
      formData.append("totalChunks", totalChunks);
      formData.append("encryptedFile", encryptedFile, {
        filename: `chunk_${chunkIndex}.bin`,
        contentType: "application/octet-stream",
      });

      const response = await fileServiceAxios.post(
        `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/sendByView`,
        formData,
        {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity, 
        }
      );

      if (response.status !== 200) {
        return res.status(response.status).send("Error from Go service");
      }

      const { shareId, message } = response.data;

      res.status(200).json({
        message: message || "File sent successfully for view-only access",
        shareId,
      });
    } catch (err) {
      console.error("Error sending file by view:", err.message);
      res.status(500).send("Failed to send file by view");
    }
  },
];

exports.getSharedViewFiles = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).send("Missing userId");
  }

  try {
    const response = await fileServiceAxios.post(
      `${
        process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/getSharedViewFiles`,
      { userId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res
        .status(response.status)
        .send("Error retrieving shared view files");
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
    const response = await fileServiceAxios.post(
      `${
        process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/getViewFileAccessLogs`,
      { fileId, userId },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res
        .status(response.status)
        .send("Error retrieving view file access logs");
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
    const response = await fileServiceAxios.post(
      `${
        process.env.FILE_SERVICE_URL || "http://localhost:8081"
      }/revokeViewAccess`,
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
    return res.status(400).send("Missing userId or fileId");
  }

  try {
    const response = await fileServiceAxios({
      method: "post",
      url: `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/downloadViewFile`,
      data: { userId, fileId },
      headers: { "Content-Type": "application/json" },
      responseType: "stream",
    });

    const viewOnly = response.headers["x-view-only"] || "true";
    const fileIdHeader = response.headers["x-file-id"] || fileId;
    const shareIdHeader = response.headers["x-share-id"] || "";

    res.set({
      "Content-Type": "application/octet-stream",
      "X-View-Only": viewOnly,
      "X-File-Id": fileIdHeader,
      "X-Share-Id": shareIdHeader,
      "Access-Control-Expose-Headers": "X-View-Only, X-File-Id, X-Share-Id",
    });

    console.log(
      `Streaming view-only file back to client -> fileId: ${fileIdHeader}, shareId: ${shareIdHeader}`
    );

    response.data.pipe(res);

    response.data.on("end", () => {
      console.log(`Finished streaming view-only (You should watch fight club) file: ${fileIdHeader}`);
    });

    response.data.on("error", (err) => {
      console.error("Stream error from Go service:", err.message);
      res.end(); 
    });

  } catch (err) {
    console.error("Download view file error:", err.message);

    if (err.response && err.response.status === 403) {
      return res.status(403).send("Access has been revoked or expired");
    }
    return res.status(500).send("Download view file failed");
  }
};

exports.changeShareMethod = [
  upload.single("encryptedFile"),
  async (req, res) =>{
    try {
      const { fileid, userId, recipientId, newShareMethod, metadata } = req.body;
      const encryptedFile = req.file?.buffer;

      if(!fileid || !userId || !recipientId || !newShareMethod || !encryptedFile) {
        return res.status(400).send("Missing file id, user ids, new share method or encrypted file");
      }

      const formData = new FormData();
      formData.append("fileid", fileid);
      formData.append("userId", userId);
      formData.append("recipientId", recipientId);
      formData.append("newShareMethod", newShareMethod);
      formData.append("metadata", JSON.stringify(metadata));
      formData.append("encryptedFile", encryptedFile, {
        filename: "encrypted.bin",
        contentType: "application/octet-stream"
      });

      const response = await fileServiceAxios.post(
        `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/changeShareMethod`,
        formData,
        { headers: formData.getHeaders() }
      );

      if (response.status !== 200) {
        return res.status(response.status).send("Error changing share method");
      }

      const { shareId, message } = response.data;

      res.status(200).json({
        message: message || "File share method changed successfully",
        shareId
      });
    } catch (error) {
      console.error("Error changing share method:", error.message);
      res.status(500).send("Error changing share method");
    }
  }
];

exports.getUsersWithFileAccess = async (req, res) => {
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).send("Missing fileId");
  }

  try {
    const response = await fileServiceAxios.get(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/usersWithFileAccess`,
      { params: { fileId } },
      { headers: { "Content-Type": "application/json" } }
    );

    if (response.status !== 200) {
      return res.status(response.status).send("Error getting users with file access");
    }
    res.json(response.data);
  } catch (err) {
    console.error("Error getting users with file access:", err.message);
    res.status(500).send("Error getting users with file access");
  }
};

exports.deleteFolder = async (req,res) => {
  const {folderId, parentPath,recursive,tags} = req.body;

  if(!folderId){
    return res.status(400).send("Missing folderId");
  }
  if(!parentPath){
    return res.status(400).send("Missing parentPath");
  }
  if(!tags){
    return res.status(400).send("Missing tags");
  }

  try{
    const response =  await fileServiceAxios.post(
      `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/deleteFolder`,
      {folderId, parentPath, recursive,tags},
      {headers: {"Content-Type": "application/json"}}
    );

    if(response.status !== 200){
      return res.status(response.status).send("Error deleting folder");
    }
    res.status(200).send("Folder deleted successfully");
  }
  catch(err){
    console.error("Error deleting folder:", err.message);
    res.status(500).send("Error deleting folder");
  }
}