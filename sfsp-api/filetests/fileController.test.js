// fileController.test.js
const axios = require('axios');
const fileController = require('../controllers/fileController'); // adjust path
jest.mock('axios');

describe('File Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  const res = {
  status: jest.fn().mockReturnThis(), // allows chaining
  send: jest.fn(),
};


  describe('downloadFile', () => {
    test('returns 400 if path or filename missing', async () => {
      const req = { body: { path: '', filename: '' } };
      const res = {status: jest.fn().mockReturnThis(), send: jest.fn() };
      await fileController.downloadFile(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Missing path or filename");
    });

    test('returns file data on success', async () => {
      const req = { body: { path: 'path1', filename: 'file1' } };
      const res = { json: jest.fn() };
      axios.post.mockResolvedValue({
        data: { fileName: 'file1', fileContent: 'data123' },
      });

      await fileController.downloadFile(req, res);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/download'),
        { path: 'path1', filename: 'file1' },
        { headers: { "Content-Type": "application/json" } }
      );
      expect(res.json).toHaveBeenCalledWith({ fileName: 'file1', fileContent: 'data123' });
    });

    test('returns 500 on download failure', async () => {
      const req = { body: { path: 'path1', filename: 'file1' } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      axios.post.mockRejectedValue(new Error('Failed'));

      await fileController.downloadFile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith("Download failed");
    });
  });

  describe('getMetaData', () => {
    test('returns 400 if userId missing', async () => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await fileController.getMetaData(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('User ID is required');
    });

    test('returns metadata list on success', async () => {
      const req = { body: { userId: 'user1' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
      const mockData = [{ fileName: 'fileA' }, { fileName: 'fileB' }];
      axios.post.mockResolvedValue({ status: 200, data: mockData });

      await fileController.getMetaData(req, res);

      expect(res.json).toHaveBeenCalledWith(mockData);
    });

    test('forwards non-200 response status', async () => {
      const req = { body: { userId: 'user1' } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      axios.post.mockResolvedValue({ status: 404, data: null });

      await fileController.getMetaData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Error retrieving metadata');
    });

    test('returns 500 on axios error', async () => {
      const req = { body: { userId: 'user1' } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      axios.post.mockRejectedValue(new Error('Network Error'));

      await fileController.getMetaData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error retrieving metadata');
    });
  });

  describe('uploadFile', () => {
    test('returns 400 if fileName or fileContent missing', async () => {
      const req = { body: { fileName: '', fileContent: '' } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await fileController.uploadFile(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Missing file name or file content');
    });

    test('returns 201 and server response on success', async () => {
      const req = {
        body: {
          fileName: 'file1',
          fileContent: 'base64data',
          fileType: 'application/pdf',
          userId: 'user1',
          encryptionKey: 'key',
          fileDescription: 'desc',
          fileTags: ['tag1'],
          path: 'files',
        }
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };

      axios.post.mockResolvedValue({ data: { success: true } });

      await fileController.uploadFile(req, res);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          fileName: 'file1',
          fileContent: 'base64data',
          fileType: 'application/pdf',
          userId: 'user1',
          encryptionKey: 'key',
          fileDescription: 'desc',
          fileTags: ['tag1'],
          path: 'files',
        }),
        { headers: { "Content-Type": 'application/pdf' } }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "File uploaded",
        server: { success: true },
      });
    });

    test('returns 500 on upload failure', async () => {
      const req = {
        body: {
          fileName: 'file1',
          fileContent: 'base64data',
          fileType: 'application/pdf',
        }
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      axios.post.mockRejectedValue(new Error('Upload error'));

      await fileController.uploadFile(req, res);

      expect(res.status).toHaveBeenCalledWith(510);
      expect(res.send).toHaveBeenCalledWith('Upload failed');
    });
  });

  describe('getNumberOfFiles', () => {
    test('returns 400 if userId missing', async () => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await fileController.getNumberOfFiles(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('User ID is required');
    });

    test('returns file count on success', async () => {
      const req = { body: { userId: 'user1' } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
      axios.post.mockResolvedValue({ status: 200, data: 42 });

      await fileController.getNumberOfFiles(req, res);

      expect(res.json).toHaveBeenCalledWith({ fileCount: 42 });
    });

    test('forwards non-200 status', async () => {
      const req = { body: { userId: 'user1' } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      axios.post.mockResolvedValue({ status: 404, data: null });

      await fileController.getNumberOfFiles(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Error retrieving file count');
    });

    test('returns 500 on error', async () => {
      const req = { body: { userId: 'user1' } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      axios.post.mockRejectedValue(new Error('Network error'));

      await fileController.getNumberOfFiles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error retrieving file count');
    });
  });
  describe('softDeleteFile', () => {
  test('returns 400 if fileId missing', async () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await fileController.softDeleteFile(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Missing fileId');
  });

  test('returns success message on valid fileId', async () => {
    const req = { body: { fileId: '123e4567-e89b-12d3-a456-426614174000' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    axios.post.mockResolvedValue({
      status: 200,
      data: { message: 'File soft deleted successfully' },
    });

    await fileController.softDeleteFile(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/softDeleteFile'),
      { fileId: req.body.fileId },
      { headers: { 'Content-Type': 'application/json' } }
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'File soft deleted successfully' });
  });

  test('returns 500 on failure', async () => {
    const req = { body: { fileId: '123e4567-e89b-12d3-a456-426614174000' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    axios.post.mockRejectedValue(new Error('Failed'));

    await fileController.softDeleteFile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Failed to soft delete file');
  });
});

describe('softDeleteFile', () => {
  test('returns success message on valid fileId', async () => {
    const req = { body: { fileId: '123e4567-e89b-12d3-a456-426614174000' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };

    axios.post.mockResolvedValue({
      status: 200,
      data: { message: 'File soft deleted' }
    });

    await fileController.softDeleteFile(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/softDeleteFile'),
      { fileId: req.body.fileId },
      { headers: { 'Content-Type': 'application/json' } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'File soft deleted' });
  });
});

describe('restoreFile', () => {
  test('returns success message on valid fileId', async () => {
    const req = { body: { fileId: '123e4567-e89b-12d3-a456-426614174000' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };

    axios.post.mockResolvedValue({
      status: 200,
      data: { message: 'File restored' }
    });

    await fileController.restoreFile(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/restoreFile'),
      { fileId: req.body.fileId },
      { headers: { 'Content-Type': 'application/json' } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'File restored' });
  });
});

});
