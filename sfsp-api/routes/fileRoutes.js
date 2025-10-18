const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const multer = require('multer');

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2GB

router.post('/download', fileController.downloadFile);
router.post('/downloadSentFile', fileController.downloadSentFile);
router.post('/metadata', fileController.getMetaData);
router.post("/startUpload", fileController.startUpload);
router.post('/upload', upload.single("encryptedFile"), fileController.uploadChunk);
router.post('/getNumberOFFiles', fileController.getNumberOfFiles);
// access logs endpoints
router.post('/addAccesslog', fileController.addAccesslog);
router.post('/getAccesslog', fileController.getAccesslog);
router.post('/usersWithFileAccess', fileController.getUsersWithFileAccess);

router.post('/send', fileController.sendFile);
router.post('/addTags', fileController.addTags);
router.post('/addUser', fileController.addUserToTable);
router.post('/removeTags', fileController.removeFileTags);
router.post('/deleteFile', fileController.deleteFile);

router.post('/softDeleteFile', fileController.softDeleteFile);
router.post('/restoreFile', fileController.restoreFile);
router.post('/deleteFile', fileController.deleteFile);
router.post('/addDescription', fileController.addDescription);
router.post('/createFolder', fileController.createFolder);
router.patch('/updateFilePath', fileController.updateFilePath);

// send by view endpoints
router.post('/revokeViewAccess', fileController.revokeViewAccess);
router.post('/getViewAccess', fileController.getSharedViewFiles);
router.post('/sendByView', fileController.sendByView);
router.post('/getViewAccesslogs', fileController.getViewFileAccessLogs);
router.post('/downloadViewFile', fileController.downloadViewFile);
router.post('/changeShareMethod', fileController.changeShareMethod);
router.post('/deleteFolder', fileController.deleteFolder);

module.exports = router;
