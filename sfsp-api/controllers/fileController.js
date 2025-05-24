const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

exports.getFile = async (req, res) => {
	const fullPath = req.params[0]; // captures everything after /files/
	const parts = fullPath.split('/');
	const fileName = parts.pop();
	const filePath = parts.join('/');

	if (!filePath || !fileName) {
		return res.status(400).send('File path and file name are required');
	}

	try {
		const goResponse = await axios({
			method: 'get',
			url: `http://localhost:8080/files/${filePath}/${fileName}`,
			responseType: 'stream',
		});
		res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
		goResponse.data.pipe(res);
	} catch (err) {
		console.error("Error fetching file from Go server:", err.message);
		res.status(404).send('File not found');
	}
};


exports.getMetaData = async (req, res) => {
	const fileId = req.params.id;
	if (!fileId) return res.status(400).send('File ID is required');

	try {
		const metadata = await FileMetadata.findById(fileId);
		if (!metadata) return res.status(404).send('File metadata not found');
		res.json(metadata);
	} catch (err) {
		res.status(500).send('Error retrieving metadata');
	}
};

exports.uploadFile = async (req, res) => {
	const file = req.file;

	if (!file) return res.status(400).send('No file uploaded');

	const metadata = {
		fileName: req.body.fileName,
		fileSize: req.body.fileSize,
		fileType: req.body.fileType,
		userId: req.body.userId,
		encryptionKey: req.body.encryptionKey,
		uploadTimestamp: req.body.uploadTimestamp,
		fileDescription: req.body.fileDescription,
		fileTags: req.body.fileTags,
		fileTypes: req.body.fileTypes,
	};

	// Validate required fields
	for (const key of Object.keys(metadata)) {
		if (!metadata[key]) {
			return res.status(400).send(`Missing required field: ${key}`);
		}
	}

	try {
		const form = new FormData();
		form.append('file', fs.createReadStream(file.path)); // OR Buffer if in-memory
		for (const key in metadata) {
			form.append(key, metadata[key]);
		}

		const response = await axios.post('http://localhost:8080/upload', form, {
			headers: form.getHeaders()
		});

		res.status(201).send({
			message: 'File uploaded successfully',
			goResponse: response.data
		});
	} catch (err) {
		console.error("Error uploading to Go server:", err.message);
		res.status(500).send('File upload failed');
	}
};


exports.deleteFile = (req, res) => {

}

exports.getFileList = (req, res) => {

}