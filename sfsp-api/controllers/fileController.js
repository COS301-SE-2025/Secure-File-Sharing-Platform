const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

exports.downloadFile = async (req, res) => {
  const { path: filePath, filename } = req.query;

  try {
    const response = await axios({
      method: 'get',
      url: `${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/download`,
      params: { path: filePath, filename },
      responseType: 'stream',
    });

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    response.data.pipe(res);
  } catch (err) {
    console.error("Download error:", err.message);
    res.status(500).send("Download failed");
  }
};

exports.getMetaData = async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).send('User ID is required');
  }

  try {
    const response = await axios.get(`${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/metadata`, {
      params: { userId },
    });
    if (response.status !== 200) {
      return res.status(response.status).send('Error retrieving metadata');
    }
    const metadataList = response.data;

    res.json(metadataList);
  } catch (err) {
    console.error("Error retrieving metadata:", err.message);
    res.status(500).send('Error retrieving metadata');
  }
};

exports.uploadFile = async (req, res) => {
  try {
    const {
      fileType,
      userId,
      encryptionKey,
      fileDescription,
      fileTags,
      path: uploadPath,
    } = req.body;

    const file = req.file; // Assuming you're using multer
    if (!file) return res.status(400).send("No file uploaded");

    const form = new FormData();
    form.append('file', fs.createReadStream(file.path), file.originalname);
    form.append('fileType', fileType);
    form.append('userId', userId);
    form.append('encryptionKey', encryptionKey);
    form.append('fileDescription', fileDescription);
    form.append('fileTags', fileTags);
    form.append('path', uploadPath || 'files');

    const response = await axios.post(`${process.env.FILE_SERVICE_URL || "http://localhost:8081"}/upload`, form, {
      headers: form.getHeaders(),
    });

    res.status(201).json({ message: 'File uploaded', server: response.data });
  } catch (err) {
    console.error("Upload error:", err.message);
    res.status(500).send("Upload failed");
  }
};


exports.deleteFile = (req, res) => {

}

exports.getFileList = (req, res) => {

}