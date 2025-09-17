const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

router.post('/download',authMiddleware, fileController.downloadFile);
router.post('/downloadSentFile',authMiddleware, fileController.downloadSentFile);
router.post('/metadata',authMiddleware,fileController.getMetaData);
router.post("/startUpload",authMiddleware, fileController.startUpload);
router.post('/upload',authMiddleware,upload.single("encryptedFile"), fileController.uploadChunk);
router.post('/getNumberOFFiles', fileController.getNumberOfFiles);
// access logs endpoints
router.post('/addAccesslog',authMiddleware, fileController.addAccesslog);
router.post('/getAccesslog',authMiddleware, fileController.getAccesslog);
router.post('/usersWithFileAccess',authMiddleware, fileController.getUsersWithFileAccess);

router.post('/send',authMiddleware,fileController.sendFile);
router.post('/addTags',authMiddleware, fileController.addTags);
router.post('/addUser',authMiddleware, fileController.addUserToTable);
router.post('/removeTags',authMiddleware, fileController.removeFileTags);
router.post('/deleteFile',authMiddleware, fileController.deleteFile);

router.post('/softDeleteFile', fileController.softDeleteFile);
router.post('/restoreFile', fileController.restoreFile);
router.post('/deleteFile',authMiddleware, fileController.deleteFile);
router.post('/addDescription',authMiddleware, fileController.addDescription);
router.post('/createFolder',authMiddleware, fileController.createFolder);
router.patch('/updateFilePath',authMiddleware,fileController.updateFilePath);

// send by view endpoints
router.post('/revokeViewAccess',authMiddleware, fileController.revokeViewAccess);
router.post('/getViewAccess',authMiddleware, fileController.getSharedViewFiles);
router.post('/sendByView',authMiddleware,fileController.sendByView);
router.post('/getViewAccesslogs', fileController.getViewFileAccessLogs);
router.post('/downloadViewFile',authMiddleware,fileController.downloadViewFile);
router.post('/changeShareMethod',authMiddleware, fileController.changeShareMethod);

module.exports = router;
