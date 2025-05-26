const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.post('/download', fileController.downloadFile);
router.post("/metadata", fileController.getMetaData)
router.post('/upload', fileController.uploadFile);

module.exports = router;