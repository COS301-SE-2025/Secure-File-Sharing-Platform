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
      const req = { body: { userId: '', filename: '' } }
      const res = {status: jest.fn().mockReturnThis(), send: jest.fn() };
      await fileController.downloadFile(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  

    test('returns file data on success', async () => {
  const req = { body: { userId: 'user1', filename: 'file1' } };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn()
  };

  axios.post.mockResolvedValue({
    data: { fileName: 'file1', fileContent: 'data123', nonce: 'abc123' },
  });

  await fileController.downloadFile(req, res);

  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining('/download'),
    { userId: 'user1', filename: 'file1' },
    { headers: { "Content-Type": "application/json" } }
  );

  expect(res.json).toHaveBeenCalledWith({
    fileName: 'file1',
    fileContent: 'data123',
    nonce: 'abc123'
  });
});

    test('returns 500 on download failure', async () => {
      const req = { body: { userId: 'user1', filename: 'file1' } }
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
      test('returns 400 if nonce is missing', async () => {
    const req = {
      body: {
        fileName: 'file1',
        fileContent: 'base64data',
        fileType: 'application/pdf',
        userId: 'user1',
        // nonce: 'abc123' <- missing
        fileDescription: 'desc',
        fileTags: ['tag1'],
        path: 'files',
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await fileController.uploadFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Missing nonce'); // adjust message to match your controller
  });

   test('returns 201 and server response on success', async () => {
    const req = {
      body: {
        fileName: 'file1',
        fileContent: 'base64data',
        fileType: 'application/pdf',
        userId: 'user1',
        nonce: 'abc123', // FIXED: nonce is required by controller
        fileDescription: 'desc',
        fileTags: ['tag1'],
        path: 'files',
      }
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };

    axios.post.mockResolvedValue({ data: { success: true } });

    await fileController.uploadFile(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/upload'),
      expect.objectContaining({
        fileName: 'file1',
        fileContent: 'base64data',
        fileType: 'application/pdf',
        userId: 'user1',
        nonce: 'abc123',
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
      fileType: 'application/pdf',
      userId: 'user1',
      nonce: 'abc123',
      fileContent: 'base64data',
      fileTags: ['tag1'],
      fileDescription: 'desc',
      path: 'files',
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };

    axios.post.mockRejectedValue(new Error('Something bad happened'));

    await fileController.uploadFile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
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
describe('sendFile', () => {
  const baseReq = {
    body: {
      fileid: 'file123',
      userId: 'user1',
      recipientUserId: 'user2',
      encryptedFile: 'filedata',
      encryptedAesKey: 'aeskey',
      ekPublicKey: 'ek-pub-key',
      metadata: {
        fileNonce: 'nonce1',
        keyNonce: 'nonce2',
        ikPublicKey: 'ikPub',
        ekPublicKey: 'ekPub',
        opk_id: 'opkId',
      },
    },
  };

  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 if fileid is missing', async () => {
    const req = { body: { ...baseReq.body, fileid: undefined } };

    await fileController.sendFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("File ID is missing");
  });

  test('returns 400 if userId or recipientUserId is missing', async () => {
    const req = { body: { ...baseReq.body, userId: '', recipientUserId: '' } };

    await fileController.sendFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User ID or Recipient User ID is missing");
  });

  test('returns 400 if encryptedFile or encryptedAesKey is missing', async () => {
    const req = {
      body: {
        ...baseReq.body,
        encryptedFile: null,
        encryptedAesKey: null,
      },
    };

    await fileController.sendFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Encrypted file or AES key is missing");
  });

  test('returns 400 if metadata is incomplete', async () => {
    const req = {
      body: {
        ...baseReq.body,
        metadata: { fileNonce: 'only-this-one' },
      },
    };

    await fileController.sendFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Metadata is incomplete or missing required keys");
  });

  test('returns 200 if file is sent successfully', async () => {
    axios.post.mockResolvedValue({ status: 200 });

    await fileController.sendFile(baseReq, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/sendFile'),
      expect.objectContaining({
        fileid: 'file123',
        userId: 'user1',
        recipientUserId: 'user2',
        encryptedFile: 'filedata',
        encryptedAesKey: 'aeskey',
        ekPublicKey: 'ek-pub-key',
        metadata: expect.any(Object),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "File sent successfully" });
  });

  test('forwards backend error if axios returns non-200', async () => {
    axios.post.mockResolvedValue({ status: 500 });

    await fileController.sendFile(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Error sending file");
  });

  test('returns 500 on axios failure', async () => {
    axios.post.mockRejectedValue(new Error('Network down'));

    await fileController.sendFile(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Failed to send file");
  });
});

describe('addAccesslog', () => {
  const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  test('returns 400 if required fields are missing', async () => {
    const req = { body: {} };

    await fileController.addAccesslog(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      "Missing required fields: file_id, user_id, action or message"
    );
  });

  test('returns success if access log is added', async () => {
    const req = {
      body: {
        file_id: 'file1',
        user_id: 'user1',
        action: 'VIEWED',
        message: 'User viewed file',
      },
    };

    axios.post.mockResolvedValue({ status: 200, data: 'OK' });

    await fileController.addAccesslog(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/addAccesslog'),
      expect.objectContaining(req.body),
      { headers: { "Content-Type": "application/json" } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });

  test('returns 500 on error', async () => {
    const req = {
      body: {
        file_id: 'file1',
        user_id: 'user1',
        action: 'VIEWED',
        message: 'User viewed file',
      },
    };

    axios.post.mockRejectedValue(new Error('Service unavailable'));

    await fileController.addAccesslog(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Failed to add access log");
  });
});

describe('getAccesslog', () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  test('returns logs if file_id provided', async () => {
    const req = { body: { file_id: 'file1' } };
    const mockLogs = [{ action: 'VIEWED', message: '...' }];

    axios.post.mockResolvedValue({ status: 200, data: mockLogs });

    await fileController.getAccesslog(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/getAccesslog'),
      { file_id: 'file1' },
      { headers: { "Content-Type": "application/json" } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockLogs);
  });

  test('returns all logs if file_id not provided', async () => {
    const req = { body: {} };
    axios.post.mockResolvedValue({ status: 200, data: [] });

    await fileController.getAccesslog(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/getAccesslog'),
      {},
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test('returns 500 on error', async () => {
    const req = { body: {} };
    axios.post.mockRejectedValue(new Error('Server error'));

    await fileController.getAccesslog(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Failed to get access log");
  });
});

describe('addTags', () => {
  const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  test('returns 400 if required fields missing', async () => {
    const req = { body: { fileId: '', tags: null } };

    await fileController.addTags(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Missing required fields: fileId or tags");
  });

  test('returns success if tags added', async () => {
    const req = { body: { fileId: 'file1', tags: ['tag1', 'tag2'] } };

    axios.post.mockResolvedValue({ status: 200, data: 'Tagged' });

    await fileController.addTags(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/addTags'),
      req.body,
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Tagged');
  });

  test('returns 500 on error', async () => {
    const req = { body: { fileId: 'file1', tags: ['tag1'] } };

    axios.post.mockRejectedValue(new Error('Server error'));

    await fileController.addTags(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Failed to add tags to the file");
  });
});

describe('addUserToTable', () => {
  const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  test('returns 400 if userId missing', async () => {
    const req = { body: {} };

    await fileController.addUserToTable(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Missing UserId");
  });

  test('returns success if user added', async () => {
    const req = { body: { userId: 'user123' } };

    axios.post.mockResolvedValue({ status: 200, data: 'User added' });

    await fileController.addUserToTable(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/addUser'),
      { userId: 'user123' },
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('User added');
  });

  test('returns 500 on error', async () => {
    const req = { body: { userId: 'user123' } };

    axios.post.mockRejectedValue(new Error('Database down'));

    await fileController.addUserToTable(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Failed to add Users to the Table");
  });
});

describe('removeFileTags', () => {
  const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  test('returns 400 if fileId or tags are missing', async () => {
    const req = { body: {} };

    await fileController.removeFileTags(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Missing required fields: fileId or tags");
  });

  test('calls backend and returns success response', async () => {
    const req = { body: { fileId: 'file123', tags: ['tag1', 'tag2'] } };

    axios.post.mockResolvedValue({ status: 200, data: 'Tags removed' });

    await fileController.removeFileTags(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/removeTags'),
      req.body,
      { headers: { 'Content-Type': 'application/json' } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Tags removed');
  });

  test('returns 500 on axios failure', async () => {
    const req = { body: { fileId: 'file123', tags: ['tag1'] } };

    axios.post.mockRejectedValue(new Error('Network error'));

    await fileController.removeFileTags(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Failed to remove tags to the file");
  });
});

describe('downloadSentFile', () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  test('returns 400 if filepath is missing', async () => {
    const req = { body: {} };

    await fileController.downloadSentFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("file path is required");
  });

  test('returns JSON metadata list on success', async () => {
    const req = { body: { filepath: 'path/to/file' } };
    const mockMetadata = [{ key: 'value' }];

    axios.post.mockResolvedValue({ status: 200, data: mockMetadata });

    await fileController.downloadSentFile(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/downloadSentFile'),
      { filepath: 'path/to/file' },
      { headers: { "Content-Type": "application/json" } }
    );
    expect(res.json).toHaveBeenCalledWith(mockMetadata);
  });

  test('returns error status if backend response is not 200', async () => {
    const req = { body: { filepath: 'path/to/file' } };

    axios.post.mockResolvedValue({ status: 404, data: null });

    await fileController.downloadSentFile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith("Error retrieving the sent file");
  });

  test('returns 500 on exception', async () => {
    const req = { body: { filepath: 'file.xyz' } };

    axios.post.mockRejectedValue(new Error('Timeout'));

    await fileController.downloadSentFile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Error retrieving the sent file");
  });
});


});
