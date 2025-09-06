const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2GB

router.post('/download', fileController.downloadFile);
router.post('/downloadSentFile', fileController.downloadSentFile);
router.post('/metadata',authMiddleware,fileController.getMetaData);
router.post("/startUpload", fileController.startUpload);
router.post('/upload',upload.single("encryptedFile"), fileController.uploadChunk);
router.post('/getNumberOFFiles', fileController.getNumberOfFiles);
// access logs endpoints
router.post('/addAccesslog',authMiddleware, fileController.addAccesslog);
router.post('/getAccesslog',authMiddleware, fileController.getAccesslog);
router.post('/usersWithFileAccess', fileController.getUsersWithFileAccess);

router.post('/send', fileController.sendFile);
router.post('/addTags',authMiddleware, fileController.addTags);
router.post('/addUser', fileController.addUserToTable);
router.post('/removeTags',authMiddleware, fileController.removeFileTags);
router.post('/deleteFile', fileController.deleteFile);

router.post('/softDeleteFile', fileController.softDeleteFile);
router.post('/restoreFile', fileController.restoreFile);
router.post('/deleteFile',authMiddleware, fileController.deleteFile);
router.post('/addDescription',authMiddleware, fileController.addDescription);
router.post('/createFolder',authMiddleware, fileController.createFolder);
router.patch('/updateFilePath', fileController.updateFilePath);

// send by view endpoints
router.post('/revokeViewAccess',authMiddleware, fileController.revokeViewAccess);
router.post('/getViewAccess',authMiddleware, fileController.getSharedViewFiles);
router.post('/sendByView', fileController.sendByView);
router.post('/getViewAccesslogs', fileController.getViewFileAccessLogs);
router.post('/downloadViewFile', fileController.downloadViewFile);
router.post('/changeShareMethod', fileController.changeShareMethod);

module.exports = router;
