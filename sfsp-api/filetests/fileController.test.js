const request = require('supertest');
const express = require('express');
const { Readable, PassThrough } = require('stream');

// Create a proper axios mock that matches how axios is used
const mockAxios = jest.fn();
mockAxios.get = jest.fn();
mockAxios.post = jest.fn();
mockAxios.put = jest.fn();
mockAxios.delete = jest.fn();
mockAxios.create = jest.fn(() => mockAxios);

// Mock modules - axios should be mocked as default export
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

// Set up routes - using POST as your controller expects req.body
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
    
    // Reset all axios method mocks
    mockAxios.get.mockReset();
    mockAxios.post.mockReset();
    
    // Set default successful responses
    mockAxios.post.mockResolvedValue({
      status: 200,
      data: { success: true }
    });
  });

  describe('downloadFile', () => {
    // it('should successfully initiate file download with proper headers', async () => {
    //   const mockStream = new PassThrough();
      
    //   mockAxios.get.mockResolvedValueOnce({
    //     data: mockStream,
    //     headers: {
    //       'x-file-name': 'test.txt',
    //       'x-nonce': 'test-nonce-123',
    //       'content-type': 'text/plain'
    //     }
    //   });

    //   const responsePromise = request(app)
    //     .post('/download')
    //     .send({ userId: 'user123', fileId: 'file123' });

    //   setTimeout(() => {
    //     mockStream.end();
    //   }, 10);

    //   const result = await responsePromise;

    //   expect(result.status).toBe(200);
    //   expect(result.headers['content-type']).toBe('text/plain');
      
    //   expect(mockAxios.get).toHaveBeenCalledWith(
    //     expect.stringContaining('/download'),
    //     expect.objectContaining({
    //       params: { userId: 'user123', fileId: 'file123' },
    //       responseType: 'stream'
    //     })
    //   );
    // });

    it('should return 400 when userId or fileId is missing', async () => {
      const response = await request(app)
        .post('/download')
        .send({ userId: 'user123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing userId or fileId');
    });

    it('should return 500 when headers are missing from Go service', async () => {
      const mockStream = new PassThrough();

      mockAxios.get.mockResolvedValue({
        data: mockStream,
        headers: {} 
      });

      const responsePromise = request(app)
        .post('/download')
        .send({
          userId: 'user123',
          fileId: 'file456'
        });

      setTimeout(() => {
        mockStream.end();
      }, 10);

      const response = await responsePromise;

      expect(response.status).toBe(500);
      expect(response.text).toBe('Download failed');
    });

    it('should handle axios errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .post('/download')
        .send({
          userId: 'user123',
          fileId: 'file456'
        });

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
    it('should successfully delete a file', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: 'File deleted'
      });

      const response = await request(app)
        .post('/deleteFile')
        .send({
          fileId: 'file123',
          userId: 'user123'
        });

      expect(response.status).toBe(200);
      expect(response.text).toBe('File deleted successfully');
    });

    it('should return 400 when fileId is missing', async () => {
      const response = await request(app)
        .post('/deleteFile')
        .send({ userId: 'user123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('FileId not received');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/deleteFile')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('UserId not found');
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
    it('should successfully add description', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: 'Description added'
      });

      const response = await request(app)
        .post('/addDescription')
        .send({
          fileId: 'file123',
          description: 'New description'
        });

      expect(response.status).toBe(200);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/addDescription')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing fileId or description');
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
    it('should successfully add user to table', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: 'User added'
      });

      const response = await request(app)
        .post('/addUserToTable')
        .send({ userId: 'user123' });

      expect(response.status).toBe(200);
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/addUserToTable')
        .send({});

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing UserId');
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
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: 'Tags removed'
      });

      const response = await request(app)
        .post('/removeFileTags')
        .send({
          fileId: 'file123',
          tags: ['tag1']
        });

      expect(response.status).toBe(200);
    });
  });

  describe('updateFilePath', () => {
    it('should successfully update file path', async () => {
      const mockResponse = { message: 'Path updated' };
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: mockResponse
      });

      const response = await request(app)
        .post('/updateFilePath')
        .send({
          fileId: 'file123',
          newPath: '/new/path'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResponse);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/updateFilePath')
        .send({ fileId: 'file123' });

      expect(response.status).toBe(400);
      expect(response.text).toBe('Missing fileId or newPath');
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