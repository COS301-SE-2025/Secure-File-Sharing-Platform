const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.post('/download', fileController.downloadFile);
router.post("/metadata", fileController.getMetaData)
router.post('/upload', fileController.uploadFile);
router.post('/getNumberOFFiles', fileController.getNumberOfFiles);
router.post('/addAccesslog', fileController.addAccesslog);
router.delete('/removeAccesslog', fileController.removeAccesslog);
router.get('/getAccesslog', fileController.getAccesslog);
router.post('/send', fileController.sendFile);

router.post('/softDeleteFile', fileController.softDeleteFile);
router.post('/restoreFile', fileController.restoreFile);


module.exports = router;