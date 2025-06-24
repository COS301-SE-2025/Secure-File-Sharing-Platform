const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.post('/download', fileController.downloadFile);
router.post("/metadata", fileController.getMetaData)
router.post('/upload', fileController.uploadFile);
router.post('/getNumberOFFiles', fileController.getNumberOfFiles);
router.post('/addAccesslog', fileController.addAccesslog);
router.get('/getAccesslog', fileController.getAccesslog);
router.post('/send', fileController.sendFile);
router.post('/addTags', fileController.addTags);
router.post("/addUser", fileController.addUserToTable);
router.post("/removeTags",fileController.removeFileTags);

router.post('/softDeleteFile', fileController.softDeleteFile);
router.post('/restoreFile', fileController.restoreFile);


module.exports = router;