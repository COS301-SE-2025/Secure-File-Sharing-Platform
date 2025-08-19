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

const app = express();
app.use(express.json());

const fileController = require('../controllers/fileController'); 

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
//------------------------------------------------------------------------------------
app.post('/download', fileController.downloadFile);
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
//------------------------------------------------------------------------------------
app.post('/downloadSentFile', fileController.downloadSentFile);
describe("downloadSentFile", () => {
  it("should return 400 if filepath missing", async () => {
    const res = await request(app).post("/downloadSentFile").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("File path is required");
  });

  it("should stream sent file successfully", async () => {
    const mockStream = new PassThrough();
    const fileContent = "sent file content";

    process.nextTick(() => {
      mockStream.write(fileContent);
      mockStream.end();
    });

    mockAxios.mockResolvedValueOnce = mockAxios.post.mockResolvedValueOnce;
    mockAxios.post.mockResolvedValueOnce({ data: mockStream });

    const res = await request(app)
      .post("/downloadSentFile")
      .send({ filepath: "/folder/sentFile.txt" })
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/octet-stream");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="sentFile.txt"'
    );
    expect(res.body.toString()).toBe(fileContent);
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/downloadSentFile")
      .send({ filepath: "/folder/sentFile.txt" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Error retrieving the sent file");
  });
});
//------------------------------------------------------------------------------------
app.post('/downloadViewFile', fileController.downloadViewFile);
describe("downloadViewFile", () => {
  it("should return 400 if missing userId or fileId", async () => {
    const res = await request(app).post("/downloadViewFile").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing userId or fileId");
  });

  it("should stream view-only file and set headers", async () => {
    const mockStream = new PassThrough();
    const fileContent = "view-only file content";

    process.nextTick(() => {
      mockStream.write(fileContent);
      mockStream.end();
    });

    mockAxios.post.mockResolvedValueOnce({
      data: mockStream,
      headers: {
        "x-view-only": "true",
        "x-file-id": "file123",
        "x-share-id": "share789",
      },
    });

    const response = await request(app)
      .post("/downloadViewFile")
      .send({ userId: "user123", fileId: "file123" })
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/octet-stream");
    expect(response.headers["x-view-only"]).toBe("true");
    expect(response.headers["x-file-id"]).toBe("file123");
    expect(response.headers["x-share-id"]).toBe("share789");
    expect(response.body.toString()).toBe(fileContent);
  });

  it("should handle stream error gracefully", async () => {
    const mockStream = new PassThrough();

    process.nextTick(() => {
      mockStream.emit("error", new Error("Stream failed"));
    });

    mockAxios.post.mockResolvedValueOnce({
      data: mockStream,
      headers: {
        "x-view-only": "true",
        "x-file-id": "file123",
        "x-share-id": "share789",
      },
    });

    const response = await request(app)
      .post("/downloadViewFile")
      .send({ userId: "user123", fileId: "file123" })
      .buffer(true)
      .parse((res, cb) => {
        res.on("data", () => {});
        res.on("end", () => cb(null, Buffer.alloc(0)));
      });

    expect(response.status).toBe(200); // stream errors just close res, status already sent
  });

  it("should return 403 if access revoked", async () => {
    mockAxios.post.mockRejectedValueOnce({ response: { status: 403 } });

    const res = await request(app)
      .post("/downloadViewFile")
      .send({ userId: "user123", fileId: "file123" });

    expect(res.status).toBe(403);
    expect(res.text).toBe("Access has been revoked or expired");
  });

  it("should return 500 if axios fails otherwise", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Service down"));

    const res = await request(app)
      .post("/downloadViewFile")
      .send({ userId: "user123", fileId: "file123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Download view file failed");
  });
});
//------------------------------------------------------------------------------------
app.post('/metadata', fileController.getMetaData);
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
//------------------------------------------------------------------------------------
app.post('/startUpload', fileController.startUpload);
describe("startUpload", () => {
  it("should return 400 if fileName or userId is missing", async () => {
    const res = await request(app).post("/startUpload").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing fileName or userId");
  });

  it("should call axios and return 200 with response data", async () => {
    const mockData = { uploadId: "123" };
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: mockData });

    const res = await request(app)
      .post("/startUpload")
      .send({ fileName: "file.txt", userId: "user123", fileTags: ["tag1", "tag2"] });

    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Service down"));

    const res = await request(app)
      .post("/startUpload")
      .send({ fileName: "file.txt", userId: "user123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to start upload");
  });
});
//------------------------------------------------------------------------------------
app.use('/uploadChunk', fileController.uploadChunk);
describe("uploadChunk", () => {
  const fileBuffer = Buffer.from("chunk data");

  it("should return 400 if fileName or file chunk missing", async () => {
    const res = await request(app).post("/uploadChunk").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing file name or chunk data");
  });

  it("should return 400 if userId, nonce, fileHash, or fileId missing", async () => {
    const res = await request(app)
      .post("/uploadChunk")
      .field("fileName", "test.txt")
      .attach("file", fileBuffer, { filename: "test.txt" });

    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing userId, nonce, fileHash, or fileId");
  });

  it("should upload file successfully and return Go response", async () => {
    const mockGoResponse = { status: 200, data: { message: "Chunk uploaded" } };
    mockAxios.post.mockResolvedValueOnce(mockGoResponse);

    const res = await request(app)
      .post("/uploadChunk")
      .field("fileName", "test.txt")
      .field("userId", "user123")
      .field("nonce", "nonce123")
      .field("fileHash", "hash123")
      .field("fileId", "file123")
      .attach("file", fileBuffer, { filename: "test.txt" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockGoResponse.data);
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Go service down"));

    const res = await request(app)
      .post("/uploadChunk")
      .field("fileName", "test.txt")
      .field("userId", "user123")
      .field("nonce", "nonce123")
      .field("fileHash", "hash123")
      .field("fileId", "file123")
      .attach("file", fileBuffer, { filename: "test.txt" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Upload failed");
  });
});
//------------------------------------------------------------------------------------
app.post('/getNumberOfFiles', fileController.getNumberOfFiles);
 describe("getNumberOfFiles", () => {
  it("should return 400 if userId is missing", async () => {
    const res = await request(app).post("/getNumberOfFiles").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("User ID is required");
  });

  it("should return file count if successful", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: 5 });

    const res = await request(app).post("/getNumberOfFiles").send({ userId: "user123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fileCount: 5 });
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Service down"));

    const res = await request(app).post("/getNumberOfFiles").send({ userId: "user123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Error retrieving file count");
  });
});
//------------------------------------------------------------------------------------
app.post('/deleteFile', fileController.deleteFile);
describe("deleteFile", () => {
  it("should return 400 if fileId missing", async () => {
    const res = await request(app).post("/deleteFile").send({ userId: "user123" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("FileId not received");
  });

  it("should return 400 if userId missing", async () => {
    const res = await request(app).post("/deleteFile").send({ fileId: "file123" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("UserId not found");
  });

  it("should delete file successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200 });

    const res = await request(app)
      .post("/deleteFile")
      .send({ fileId: "file123", userId: "user123" });

    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.text).toBe("File deleted successfully");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Service down"));

    const res = await request(app)
      .post("/deleteFile")
      .send({ fileId: "file123", userId: "user123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Error deleting file");
  });
});
//------------------------------------------------------------------------------------
app.post('/sendFile', fileController.sendFile);
describe("sendFile", () => {
  const fileBuffer = Buffer.from("encrypted content");

  it("should return 400 if required fields or file chunk missing", async () => {
    const res = await request(app).post("/sendFile").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing required fields or file chunk");
  });

  it("should send file successfully and return Go service response", async () => {
    // Mock axios to return successful response
    const mockGoResponse = { status: 200, data: { message: "Chunk uploaded" } };
    mockAxios.post.mockResolvedValueOnce(mockGoResponse);

    // Use Supertest with multipart form data
    const res = await request(app)
      .post("/sendFile")
      .field("fileid", "file123")
      .field("userId", "user123")
      .field("recipientUserId", "recipient456")
      .field("metadata", JSON.stringify({ name: "test" }))
      .field("chunkIndex", "1")
      .field("totalChunks", "3")
      .attach("encryptedFile", fileBuffer, { filename: "chunk_1.bin" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockGoResponse.data);
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Go service down"));

    const res = await request(app)
      .post("/sendFile")
      .field("fileid", "file123")
      .field("userId", "user123")
      .field("recipientUserId", "recipient456")
      .field("metadata", JSON.stringify({ name: "test" }))
      .field("chunkIndex", "1")
      .field("totalChunks", "3")
      .attach("encryptedFile", fileBuffer, { filename: "chunk_1.bin" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to send file");
  });
});
//------------------------------------------------------------------------------------
app.post('/sendByView', fileController.sendByView);
describe("sendByView", () => {
  const buffer = Buffer.from("chunk data");

  it("should return 400 if required fields missing", async () => {
    const res = await request(app)
      .post("/sendByView")
      .attach("encryptedFile", buffer, "chunk.bin")
      .field({ fileid: "file123" }); // missing other fields

    expect(res.status).toBe(400);
    expect(res.text).toBe(
      "Missing file id, user ids, metadata, or encrypted file chunk"
    );
  });

  it("should send file by view successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { shareId: "share123", message: "Sent successfully" },
    });

    const res = await request(app)
      .post("/sendByView")
      .attach("encryptedFile", buffer, "chunk.bin")
      .field({
        fileid: "file123",
        userId: "user123",
        recipientUserId: "user456",
        metadata: JSON.stringify({ info: "test" }),
        chunkIndex: 1,
        totalChunks: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      shareId: "share123",
      message: "Sent successfully",
    });
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/sendByView")
      .attach("encryptedFile", buffer, "chunk.bin")
      .field({
        fileid: "file123",
        userId: "user123",
        recipientUserId: "user456",
        metadata: JSON.stringify({ info: "test" }),
        chunkIndex: 1,
        totalChunks: 1,
      });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to send file by view");
  });
});
//------------------------------------------------------------------------------------
app.post('/addAccesslog', fileController.addAccesslog);
describe("addAccesslog", () => {
  it("should return 400 if required fields missing", async () => {
    const res = await request(app).post("/addAccesslog").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe(
      "Missing required fields: file_id, user_id, action or message"
    );
  });

  it("should add access log successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: "Logged" });

    const res = await request(app)
      .post("/addAccesslog")
      .send({ file_id: "file123", user_id: "user123", action: "download", message: "File accessed" });

    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.text).toBe("Logged");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Log failed"));

    const res = await request(app)
      .post("/addAccesslog")
      .send({ file_id: "file123", user_id: "user123", action: "download", message: "File accessed" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to add access log");
  });
});
//------------------------------------------------------------------------------------
app.post('/getAccesslog', fileController.getAccesslog);
  describe("getAccesslog", () => {
  it("should return access log successfully", async () => {
    const mockData = [{ action: "download", user: "user123" }];
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: mockData });

    const res = await request(app).post("/getAccesslog").send({ file_id: "file123" });

    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Service down"));

    const res = await request(app).post("/getAccesslog").send({ file_id: "file123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to get access log");
  });

  it("should send empty object if file_id not provided", async () => {
    const mockData = [{ action: "download", user: "user123" }];
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: mockData });

    const res = await request(app).post("/getAccesslog").send({});

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/getAccesslog"),
      {},
      expect.any(Object)
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });
});
//------------------------------------------------------------------------------------
app.post('/getSharedViewFiles', fileController.getSharedViewFiles);
describe("getSharedViewFiles", () => {
  it("should return 400 if userId missing", async () => {
    const res = await request(app).post("/getSharedViewFiles").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing userId");
  });

  it("should return shared view files successfully", async () => {
    const mockFiles = [{ fileId: "file1" }, { fileId: "file2" }];
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: mockFiles });

    const res = await request(app)
      .post("/getSharedViewFiles")
      .send({ userId: "user123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockFiles);
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/getSharedViewFiles")
      .send({ userId: "user123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Error retrieving shared view files");
  });
});
//------------------------------------------------------------------------------------
app.post('/getViewFileAccessLogs', fileController.getViewFileAccessLogs);
describe("getViewFileAccessLogs", () => {
  it("should return 400 if fileId or userId missing", async () => {
    const res = await request(app)
      .post("/getViewFileAccessLogs")
      .send({ fileId: "file123" }); // missing userId
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing fileId or userId");
  });

  it("should return access logs successfully", async () => {
    const mockLogs = [{ action: "view", timestamp: "now" }];
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: mockLogs });

    const res = await request(app)
      .post("/getViewFileAccessLogs")
      .send({ fileId: "file123", userId: "user123" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockLogs);
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/getViewFileAccessLogs")
      .send({ fileId: "file123", userId: "user123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Error retrieving view file access logs");
  });
});
//------------------------------------------------------------------------------------
app.post('/revokeViewAccess', fileController.revokeViewAccess);
describe("revokeViewAccess", () => {
  it("should return 400 if required fields missing", async () => {
    const res = await request(app)
      .post("/revokeViewAccess")
      .send({ fileId: "file123", userId: "user123" }); // missing recipientId
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing fileId, userId or recipientId");
  });

  it("should revoke view access successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200 });

    const res = await request(app)
      .post("/revokeViewAccess")
      .send({
        fileId: "file123",
        userId: "user123",
        recipientId: "user456",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "View access revoked successfully" });
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/revokeViewAccess")
      .send({
        fileId: "file123",
        userId: "user123",
        recipientId: "user456",
      });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Error revoking view access");
  });
});
//------------------------------------------------------------------------------------
app.post('/addTags', fileController.addTags);
describe("addTags", () => {
  it("should return 400 if missing fileId or tags", async () => {
    const res = await request(app).post("/addTags").send({ fileId: "file123" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing required fields: fileId or tags");
  });

  it("should add tags successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: "Tags added" });

    const res = await request(app)
      .post("/addTags")
      .send({ fileId: "file123", tags: ["tag1", "tag2"] });

    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.text).toBe("Tags added");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/addTags")
      .send({ fileId: "file123", tags: ["tag1"] });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to add tags to the file");
  });
});
//------------------------------------------------------------------------------------
app.post('/removeFileTags', fileController.removeFileTags);
describe("removeFileTags", () => {
  it("should return 400 if missing fileId or tags", async () => {
    const res = await request(app).post("/removeFileTags").send({ fileId: "file123" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing required fields: fileId or tags");
  });

  it("should remove tags successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: "Tags removed" });

    const res = await request(app)
      .post("/removeFileTags")
      .send({ fileId: "file123", tags: ["tag1"] });

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/removeTags"),
      { fileId: "file123", tags: ["tag1"] },
      expect.any(Object)
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe("Tags removed");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/removeFileTags")
      .send({ fileId: "file123", tags: ["tag1"] });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to remove tags to the file");
  });
});
//------------------------------------------------------------------------------------
app.post('/addUserToTable', fileController.addUserToTable);
describe("addUserToTable", () => {
  it("should return 400 if missing userId", async () => {
    const res = await request(app).post("/addUserToTable").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing UserId");
  });

  it("should add user successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: "User added" });

    const res = await request(app).post("/addUserToTable").send({ userId: "user123" });

    expect(mockAxios.post).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.text).toBe("User added");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app).post("/addUserToTable").send({ userId: "user123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to add Users to the Table");
  });
});
//------------------------------------------------------------------------------------
app.post('/softDeleteFile', fileController.softDeleteFile);
describe("softDeleteFile", () => {
  it("should return 400 if fileId missing", async () => {
    const res = await request(app).post("/softDeleteFile").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing fileId");
  });

  it("should soft delete file successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: "File soft deleted" });

    const res = await request(app).post("/softDeleteFile").send({ fileId: "file123" });

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/softDeleteFile"),
      { fileId: "file123" },
      expect.any(Object)
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe("File soft deleted");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app).post("/softDeleteFile").send({ fileId: "file123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to soft delete file");
  });
});
//------------------------------------------------------------------------------------
app.post('/restoreFile', fileController.restoreFile);
describe("restoreFile", () => {
  it("should return 400 if fileId missing", async () => {
    const res = await request(app).post("/restoreFile").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing fileId");
  });

  it("should restore file successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: "File restored" });

    const res = await request(app).post("/restoreFile").send({ fileId: "file123" });

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/restoreFile"),
      { fileId: "file123" },
      expect.any(Object)
    );
    expect(res.status).toBe(200);
    expect(res.text).toBe("File restored");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app).post("/restoreFile").send({ fileId: "file123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Restore failed");
  });
});

//------------------------------------------------------------------------------------
app.post('/createFolder', fileController.createFolder);
describe("createFolder", () => {
  it("should return 400 if userId or folderName missing", async () => {
    const res = await request(app).post("/createFolder").send({ userId: "user123" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing userId or folderName");
  });

  it("should create folder successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: { folderId: "folder123" } });

    const res = await request(app)
      .post("/createFolder")
      .send({ userId: "user123", folderName: "NewFolder" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ folderId: "folder123" });
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/createFolder")
      .send({ userId: "user123", folderName: "NewFolder" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to create folder");
  });
});
//------------------------------------------------------------------------------------
app.post('/updateFilePath', fileController.updateFilePath);
describe("updateFilePath", () => {
  it("should return 400 if fileId or newPath missing", async () => {
    const res = await request(app).post("/updateFilePath").send({ fileId: "file123" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing fileId or newPath");
  });

  it("should update file path successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: { updated: true } });

    const res = await request(app)
      .post("/updateFilePath")
      .send({ fileId: "file123", newPath: "/new/path/file.txt" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ updated: true });
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/updateFilePath")
      .send({ fileId: "file123", newPath: "/new/path/file.txt" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to update file path");
  });
});
//------------------------------------------------------------------------------------
app.post('/addDescription', fileController.addDescription);
describe("addDescription", () => {
  it("should return 400 if fileId or description missing", async () => {
    const res = await request(app).post("/addDescription").send({ fileId: "file123" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing fileId or description");
  });

  it("should add description successfully", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 200, data: "Description added" });

    const res = await request(app)
      .post("/addDescription")
      .send({ fileId: "file123", description: "Test desc" });

    expect(res.status).toBe(200);
    expect(res.text).toBe("Description added");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app)
      .post("/addDescription")
      .send({ fileId: "file123", description: "Test desc" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to add description to the file");
  });
});
//------------------------------------------------------------------------------------


});
