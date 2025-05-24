const router = require('express').Router();
const fileController = require('../controllers/fileController');

router.get('/files/*', fileController.getFile);
router.get('/metadata/:id', fileController.getMetaData);
router.post('/upload', fileController.uploadFile);