const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.post('/download', fileController.downloadFile);
router.post("/metadata", fileController.getMetaData)
router.post('/upload', fileController.uploadFile);
router.post('/getNumberOFFiles', fileController.getNumberOfFiles);
router.post('/send', fileController.sendFile);

module.exports = router;