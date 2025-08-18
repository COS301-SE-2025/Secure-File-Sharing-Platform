const request = require('supertest');
const express = require('express');
const { Readable, PassThrough } = require('stream');

const mockAxios = jest.fn();
mockAxios.get = jest.fn();
mockAxios.post = jest.fn();
mockAxios.put = jest.fn();
mockAxios.delete = jest.fn();
mockAxios.create = jest.fn(() => mockAxios);

jest.mock('axios', () => mockAxios);
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('form-data', () => {
  const mockInstance = {
    append: jest.fn(),
    getHeaders: jest.fn(() => ({ 'content-type': 'multipart/form-data' }))
  };
  return jest.fn(() => mockInstance);
});

const fileController = require('../controllers/fileController'); 

const app = express();
app.use(express.json());

app.post('/download', fileController.downloadFile);
app.post('/metadata', fileController.getMetaData);
app.post('/startUpload', fileController.startUpload);
app.post('/getNumberOfFiles', fileController.getNumberOfFiles);
app.post('/deleteFile', fileController.deleteFile);
app.post('/addAccesslog', fileController.addAccesslog);
app.post('/getAccesslog', fileController.getAccesslog);
app.post('/addTags', fileController.addTags);
app.post('/addUserToTable', fileController.addUserToTable);
app.post('/softDeleteFile', fileController.softDeleteFile);
app.post('/restoreFile', fileController.restoreFile);
app.post('/removeFileTags', fileController.removeFileTags);
app.post('/downloadSentFile', fileController.downloadSentFile);
app.post('/addDescription', fileController.addDescription);
app.post('/createFolder', fileController.createFolder);
app.post('/updateFilePath', fileController.updateFilePath);
app.post('/getSharedViewFiles', fileController.getSharedViewFiles);
app.post('/getViewFileAccessLogs', fileController.getViewFileAccessLogs);
app.post('/revokeViewAccess', fileController.revokeViewAccess);
app.post('/downloadViewFile', fileController.downloadViewFile);

describe('File Service Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FILE_SERVICE_URL = 'http://localhost:8081';
    
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();

    mockAxios.post.mockResolvedValue({
      status: 200,
      data: { success: true }
    });
  });

describe('downloadFile', () => {
it('should return 200 and stream file successfully', async () => {
  const mockStream = new PassThrough();
  const fileContent = 'test file content';

  mockAxios.mockResolvedValue({
    data: mockStream,
    headers: {
      'x-file-name': 'test.pdf',
      'x-nonce': 'nonce123'
    }
  });

  const req = request(app)
    .post('/download')
    .send({ userId: 'user123', fileId: 'file456' });

  // Write the data after next tick
  setTimeout(() => {
    mockStream.write(fileContent);
    mockStream.end();
  }, 10);

  // Collect the streamed data
  const response = await req.buffer(true).parse((res, cb) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  });

  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toBe('application/octet-stream');
  expect(response.headers['x-file-name']).toBe('test.pdf');
  expect(response.headers['x-nonce']).toBe('nonce123');
  expect(response.body.toString()).toBe(fileContent);
});

  it('should return 400 when userId or fileId is missing', async () => {
    const response = await request(app)
      .post('/download')
      .send({ userId: 'user123' });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Missing userId or fileId');
  });

it('should return 500 when headers are missing from Go service', async () => {
  const mockStream = new PassThrough();

  mockAxios.mockResolvedValue({
    data: mockStream,
    headers: {} // missing headers
  });

  const responsePromise = request(app)
    .post('/download')
    .send({ userId: 'user123', fileId: 'file456' });

  setTimeout(() => {
    mockStream.end();
  }, 10);

  const response = await responsePromise;

  expect(response.status).toBe(500);
  expect(response.text).toBe('Missing required file metadata from service'); // <--- update here
});


  it('should handle axios errors', async () => {
    // Mock the default axios call to reject
    mockAxios.mockRejectedValue(new Error('Network error'));

    const response = await request(app)
      .post('/download')
      .send({ userId: 'user123', fileId: 'file456' });

    expect(response.status).toBe(500);
    expect(response.text).toBe('Download failed');
  });
});


  describe('getMetaData', () => {
    it('should successfully retrieve metadata', async () => {
      const mockMetadata = [
        { id: '1', name: 'file1.txt' },
        { id: '2', name: 'file2.txt' }
      ];

      mockAxios.post.mockResolvedValue({
        status: 200,
        data: mockMetadata
      });

      const response = await request(app)
        .post('/metadata')
        .send({ userId: 'user123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMetadata);
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/metadata')
        .send({});

      expect(response.status).toBe(400);
      expect(response.text).toBe('User ID is required');
    });

    it('should handle axios errors', async () => {
      mockAxios.post.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/metadata')
        .send({ userId: 'user123' });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error retrieving metadata');
    });
  });

  describe('startUpload', () => {
    it('should successfully start upload', async () => {
      const mockResponse = { uploadId: 'upload123', status: 'started' };

      mockAxios.post.mockResolvedValue({
        status: 200,
        data: mockResponse
      });

      const response = await request(app)
        .post('/startUpload')
        .send({
          fileName: 'test.txt',
          fileType: 'text/plain',
          userId: 'user123',
          nonce: 'nonce123',
          fileDescription: 'Test file',
          fileTags: ['tag1', 'tag2'],
          path: 'uploads'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/startUpload')
        .send({ fileName: 'test.txt' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing fileName or userId');
    });

    it('should handle string fileTags correctly', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      await request(app)
        .post('/startUpload')
        .send({
          fileName: 'test.txt',
          userId: 'user123',
          fileTags: 'single-tag'
        });

      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:8081/startUpload',
        expect.objectContaining({
          fileTags: ['single-tag']
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    });
  });

  describe('getNumberOfFiles', () => {
    it('should successfully get file count', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: 5
      });

      const response = await request(app)
        .post('/getNumberOfFiles')
        .send({ userId: 'user123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ fileCount: 5 });
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/getNumberOfFiles')
        .send({});

      expect(response.status).toBe(400);
      expect(response.text).toBe('User ID is required');
    });
  });

describe('deleteFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FILE_SERVICE_URL = 'http://localhost:8081';
  });

  it('should return 400 if fileId is missing', async () => {
    const response = await request(app)
      .post('/deleteFile')
      .send({ userId: 'user123' });

    expect(response.status).toBe(400);
    expect(response.text).toBe('FileId not received');
  });

  it('should return 400 if userId is missing', async () => {
    const response = await request(app)
      .post('/deleteFile')
      .send({ fileId: 'file456' });

    expect(response.status).toBe(400);
    expect(response.text).toBe('UserId not found');
  });

  it('should return 200 if file is deleted successfully', async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200 });

    const response = await request(app)
      .post('/deleteFile')
      .send({ fileId: 'file456', userId: 'user123' });

    expect(response.status).toBe(200);
    expect(response.text).toBe('File deleted successfully');
    expect(mockAxios.post).toHaveBeenCalledWith(
      `${process.env.FILE_SERVICE_URL}/deleteFile`,
      { fileId: 'file456', userId: 'user123' },
      { fileId: 'file456', userId: 'user123' },
      { headers: { "Content-Type": "application/json" } }
    );
  });

  it('should return the same error status if response.status !== 200', async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 403 });

    const response = await request(app)
      .post('/deleteFile')
      .send({ fileId: 'file456', userId: 'user123' });

    expect(response.status).toBe(403);
    expect(response.text).toBe('Error deleting file');
  });

  it('should return 500 if axios throws an error', async () => {
    mockAxios.post.mockRejectedValueOnce(new Error('Network error'));

    const response = await request(app)
      .post('/deleteFile')
      .send({ fileId: 'file456', userId: 'user123' });

    expect(response.status).toBe(500);
    expect(response.text).toBe('Error deleting file');
  });
});


  describe('addAccesslog', () => {
    it('should successfully add access log', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: 'Log added'
      });

      const response = await request(app)
        .post('/addAccesslog')
        .send({
          file_id: 'file123',
          user_id: 'user123',
          action: 'download',
          message: 'File downloaded'
        });

      expect(response.status).toBe(200);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/addAccesslog')
        .send({
          file_id: 'file123',
          user_id: 'user123'
        });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing required fields: file_id, user_id, action or message');
    });
  });

  describe('softDeleteFile', () => {
    it('should successfully soft delete a file', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { message: 'File soft deleted' }
      });

      const response = await request(app)
        .post('/softDeleteFile')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'File soft deleted' });
    });

    it('should return 400 when fileId is missing', async () => {
      const response = await request(app)
        .post('/softDeleteFile')
        .send({});

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing fileId');
    });

    it('should handle errors and return proper message', async () => {
      mockAxios.post.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/softDeleteFile')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to soft delete file');
    });
  });

  describe('createFolder', () => {
    it('should successfully create a folder', async () => {
      const mockResponse = { folderId: 'folder123', message: 'Folder created' };
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: mockResponse
      });

      const response = await request(app)
        .post('/createFolder')
        .send({
          userId: 'user123',
          folderName: 'MyFolder',
          parentPath: '/documents',
          description: 'Test folder'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/createFolder')
        .send({ userId: 'user123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing userId or folderName');
    });
  });

  describe('downloadViewFile', () => {
    // it('should successfully download a view file', async () => {
    //   const mockStream = new PassThrough();
      
    //   mockAxios.get.mockResolvedValue({
    //     data: mockStream,
    //     headers: {
    //       'x-view-only': 'true',
    //       'x-file-id': 'file123',
    //       'x-share-id': 'share456',
    //       'content-type': 'text/plain'
    //     }
    //   });

    //   const responsePromise = request(app)
    //     .post('/downloadViewFile')
    //     .send({
    //       userId: 'user123',
    //       fileId: 'file123'
    //     });

    //   setTimeout(() => {
    //     mockStream.write('You should watch fight club');
    //     mockStream.end();
    //   }, 10);

    //   const response = await responsePromise;

    //   expect(response.status).toBe(200);
    //   expect(mockAxios.get).toHaveBeenCalledWith(
    //     expect.stringContaining('/downloadViewFile'),
    //     expect.objectContaining({
    //       params: expect.any(Object),
    //       responseType: 'stream'
    //     })
    //   );
    // });

    it('should return 403 for access denied', async () => {
      const error = new Error('Access denied');
      error.response = { status: 403 };
      mockAxios.get.mockRejectedValue(error);

      const response = await request(app)
        .post('/downloadViewFile')
        .send({
          userId: 'user123',
          fileId: 'file123'
        });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Download view file failed');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/downloadViewFile')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing userId or fileId');
    });
  });

  
  describe('addDescription', () => {
    it('should successfully add a description', async () => {
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: 'Description added'
      });

      const response = await request(app)
        .post('/addDescription')
        .send({ fileId: 'file123', description: 'Important file' });

      expect(response.status).toBe(200);
      expect(response.text).toBe('Description added');
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:8081/addDescription',
        { fileId: 'file123', description: 'Important file' },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('should return 400 if fileId or description is missing', async () => {
      const response = await request(app)
        .post('/addDescription')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing fileId or description');
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should return 500 if axios fails', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Service down'));

      const response = await request(app)
        .post('/addDescription')
        .send({ fileId: 'file123', description: 'Important file' });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to add description to the file');
    });
  });

  describe('createFolder', () => {
    it('should successfully create a folder', async () => {
      mockAxios.post.mockResolvedValueOnce({
        status: 201,
        data: { folderId: 'folder123', message: 'Folder created' }
      });

      const response = await request(app)
        .post('/createFolder')
        .send({
          userId: 'user123',
          folderName: 'NewFolder',
          parentPath: '/root',
          description: 'Project files'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ folderId: 'folder123', message: 'Folder created' });
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:8081/createFolder',
        { userId: 'user123', folderName: 'NewFolder', parentPath: '/root', description: 'Project files' },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('should return 400 if userId or folderName is missing', async () => {
      const response = await request(app)
        .post('/createFolder')
        .send({ folderName: 'NewFolder' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing userId or folderName');
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should return 500 if axios fails', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Service down'));

      const response = await request(app)
        .post('/createFolder')
        .send({ userId: 'user123', folderName: 'NewFolder' });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to create folder');
    });
  });
  describe('addTags', () => {
    it('should successfully add tags', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: 'Tags added'
      });

      const response = await request(app)
        .post('/addTags')
        .send({
          fileId: 'file123',
          tags: ['tag1', 'tag2']
        });

      expect(response.status).toBe(200);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/addTags')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing required fields: fileId or tags');
    });
  });

  describe('restoreFile', () => {
    it('should successfully restore a file', async () => {
      const mockResponse = { message: 'File restored' };
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: mockResponse
      });

      const response = await request(app)
        .post('/restoreFile')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should return 400 when fileId is missing', async () => {
      const response = await request(app)
        .post('/restoreFile')
        .send({});

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing fileId');
    });
  });

  describe('addUserToTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FILE_SERVICE_URL = 'http://localhost:8081';
  });

  it('should successfully add user to table', async () => {
    mockAxios.post.mockResolvedValueOnce({
      status: 200,
      data: 'User added'
    });

    const response = await request(app)
      .post('/addUserToTable')
      .send({ userId: 'user123' });

    expect(response.status).toBe(200);
    expect(response.text).toBe('User added');
    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://localhost:8081/addUser',
      { userId: 'user123' },
      { headers: { 'Content-Type': 'application/json' } }
    );
  });

  it('should return 400 when userId is missing', async () => {
    const response = await request(app)
      .post('/addUserToTable')
      .send({});

    expect(response.status).toBe(400);
    expect(response.text).toBe('Missing UserId');
    expect(mockAxios.post).not.toHaveBeenCalled();
  });

  it('should return 500 if axios throws an error', async () => {
    mockAxios.post.mockRejectedValueOnce(new Error('Service down'));

    const response = await request(app)
      .post('/addUserToTable')
      .send({ userId: 'user123' });

    expect(response.status).toBe(500);
    expect(response.text).toBe('Failed to add Users to the Table');
  });
  });

  describe('getAccesslog', () => {
    it('should successfully get access logs', async () => {
      const mockLogs = [
        { id: 1, action: 'download', timestamp: '2024-01-01' }
      ];
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: mockLogs
      });

      const response = await request(app)
        .post('/getAccesslog')
        .send({ file_id: 'file123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLogs);
    });
  });

  describe('removeFileTags', () => {
    it('should successfully remove tags', async () => {
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: 'Tags removed'
      });

      const response = await request(app)
        .post('/removeFileTags')
        .send({ fileId: 'file123', tags: ['tag1'] });

      expect(response.status).toBe(200);
      expect(response.text).toBe('Tags removed');
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:8081/removeTags',
        { fileId: 'file123', tags: ['tag1'] },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('should return 400 if fileId or tags are missing', async () => {
      const response = await request(app)
        .post('/removeFileTags')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing required fields: fileId or tags');
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should return 500 if axios fails', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Service down'));

      const response = await request(app)
        .post('/removeFileTags')
        .send({ fileId: 'file123', tags: ['tag1'] });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to remove tags to the file');
    });
  });

  describe('downloadSentFile', () => {
    it('should stream the file successfully', async () => {
      const mockStream = new PassThrough();
      const fileContent = 'file content here';
      mockStream.end(Buffer.from(fileContent));

      mockAxios.mockResolvedValueOnce({
        data: mockStream
      });

      const responsePromise = request(app)
        .post('/downloadSentFile')
        .send({ filepath: 'uploads/test.txt' });

      const response = await responsePromise;

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('test.txt');
      expect(response.text).toBe(fileContent);
    });

    it('should return 400 if filepath is missing', async () => {
      const response = await request(app)
        .post('/downloadSentFile')
        .send({});

      expect(response.status).toBe(400);
      expect(response.text).toBe('File path is required');
    });

    it('should return 500 if axios throws an error', async () => {
      mockAxios.mockRejectedValueOnce(new Error('Go service down'));

      const response = await request(app)
        .post('/downloadSentFile')
        .send({ filepath: 'uploads/test.txt' });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error retrieving the sent file');
    });

  });

  describe('updateFilePath', () => {
    it('should update file path successfully', async () => {
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { message: 'File path updated' }
      });

      const response = await request(app)
        .post('/updateFilePath')
        .send({ fileId: 'file123', newPath: '/new/path' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'File path updated' });
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:8081/updateFilePath',
        { fileId: 'file123', newPath: '/new/path' },
        { headers: { 'Content-Type': 'application/json' } }
      );
    });

    it('should return 400 if fileId or newPath is missing', async () => {
      const response = await request(app)
        .post('/updateFilePath')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing fileId or newPath');
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should return 500 if axios fails', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Service down'));

      const response = await request(app)
        .post('/updateFilePath')
        .send({ fileId: 'file123', newPath: '/new/path' });

      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to update file path');
    });
  });

  describe('sendByView', () => {
    it('should return 400 if any required fields or file chunk is missing', async () => {
      const response = await request(app)
        .post('/sendByView')
        .send({ userId: 'user123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe(
        'Missing file id, user ids, metadata, or encrypted file chunk'
      );
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should send file successfully for view', async () => {
      const mockFileBuffer = Buffer.from('mock content');
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { shareId: 'share123', message: 'File shared' }
      });

      const response = await request(app)
        .post('/sendByView')
        .attach('encryptedFile', mockFileBuffer, 'chunk_0.bin')
        .field('fileid', 'file123')
        .field('userId', 'user123')
        .field('recipientUserId', 'recipient456')
        .field('metadata', JSON.stringify({ tags: ['tag1'] }))
        .field('chunkIndex', '0')
        .field('totalChunks', '1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        shareId: 'share123',
        message: 'File shared'
      });
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('should return 500 if axios fails', async () => {
      const mockFileBuffer = Buffer.from('mock content');
      mockAxios.post.mockRejectedValueOnce(new Error('Service down'));

      const response = await request(app)
        .post('/sendByView')
        .attach('encryptedFile', mockFileBuffer, 'chunk_0.bin')
        .field('fileid', 'file123')
        .field('userId', 'user123')
        .field('recipientUserId', 'recipient456')
        .field('metadata', JSON.stringify({ tags: ['tag1'] }))
        .field('chunkIndex', '0')
        .field('totalChunks', '1');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Failed to send file by view');
    });
  });
  describe('getSharedViewFiles', () => {
    it('should successfully get shared view files', async () => {
      const mockFiles = [
        { id: 'file1', name: 'shared1.txt' }
      ];
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: mockFiles
      });

      const response = await request(app)
        .post('/getSharedViewFiles')
        .send({ userId: 'user123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFiles);
    });
  });
  
describe('getViewFileAccessLogs', () => {
  it('should return 400 when fileId or userId is missing', async () => {
    const response = await request(app)
      .post('/getViewFileAccessLogs')
      .send({
        fileId: 'file123'
        // userId missing
      });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Missing fileId or userId');
  });

  it('should successfully return file access logs', async () => {
    mockAxios.post.mockResolvedValue({
      status: 200,
      data: [{ userId: 'user123', accessedAt: '2025-08-18T10:00:00Z' }]
    });

    const response = await request(app)
      .post('/getViewFileAccessLogs')
      .send({
        fileId: 'file123',
        userId: 'user123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { userId: 'user123', accessedAt: '2025-08-18T10:00:00Z' }
    ]);
  });

  it('should return error when Go service responds with non-200', async () => {
    mockAxios.post.mockResolvedValue({
      status: 500,
      data: {}
    });

    const response = await request(app)
      .post('/getViewFileAccessLogs')
      .send({
        fileId: 'file123',
        userId: 'user123'
      });

    expect(response.status).toBe(500);
    expect(response.text).toBe('Error retrieving view file access logs');
  });

  it('should return 500 when axios throws error', async () => {
    mockAxios.post.mockRejectedValue(new Error('Service unavailable'));

    const response = await request(app)
      .post('/getViewFileAccessLogs')
      .send({
        fileId: 'file123',
        userId: 'user123'
      });

    expect(response.status).toBe(500);
    expect(response.text).toBe('Error retrieving view file access logs');
  });
});

  describe('revokeViewAccess', () => {
    it('should successfully revoke view access', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { message: 'Access revoked' }
      });

      const response = await request(app)
        .post('/revokeViewAccess')
        .send({
          fileId: 'file123',
          userId: 'user123',
          recipientId: 'recipient456'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'View access revoked successfully' });
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/revokeViewAccess')
        .send({
          fileId: 'file123',
          userId: 'user123'
        });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing fileId, userId or recipientId');
    });
  });
});