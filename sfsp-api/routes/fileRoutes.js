const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' }); 

router.get('/download', fileController.downloadFile);
router.get('/metadata/:id', fileController.getMetaData);
router.post('/upload', upload.single('file'), fileController.uploadFile);

module.exports = router;