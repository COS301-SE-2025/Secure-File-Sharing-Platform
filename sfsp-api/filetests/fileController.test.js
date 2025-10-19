const request = require("supertest");
const express = require("express");
const { PassThrough } = require("stream");
const multer = require("multer");

const mockAxios = jest.fn(); // callable for streaming controllers
mockAxios.create = jest.fn(() => mockAxios);
mockAxios.post = jest.fn(); // for getMetaData
mockAxios.get = jest.fn();  // optional if needed
jest.mock("axios", () => mockAxios);
jest.mock("dotenv", () => ({ config: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks(); // reset call counts
});
const app = express();
app.use(express.json());


const fileController = require("../controllers/fileController");
const upload = multer();
app.post("/downloadFile", fileController.downloadFile);
app.post('/downloadSentFile', fileController.downloadSentFile);
app.post("/downloadViewFile", fileController.downloadViewFile);
app.post('/getMetaData', fileController.getMetaData);
app.post('/startUpload', fileController.startUpload);
app.use('/uploadChunk', upload.single("file"), fileController.uploadChunk);
app.post('/getNumberOfFiles', fileController.getNumberOfFiles);
app.post('/deleteFile', fileController.deleteFile);
app.post('/sendFile', fileController.sendFile);
app.post('/sendByView', fileController.sendByView);
app.post('/addAccesslog', fileController.addAccesslog);
app.post('/getAccesslog', fileController.getAccesslog);
app.post('/getSharedViewFiles', fileController.getSharedViewFiles);
app.post('/getViewFileAccessLogs', fileController.getViewFileAccessLogs);
app.post('/revokeViewAccess', fileController.revokeViewAccess);
app.post('/addTags', fileController.addTags);
app.post('/removeFileTags', fileController.removeFileTags);
app.post('/addUserToTable', fileController.addUserToTable);
app.post('/softDeleteFile', fileController.softDeleteFile);
app.post('/restoreFile', fileController.restoreFile);
app.post('/createFolder', fileController.createFolder);
app.post('/updateFilePath', fileController.updateFilePath);
app.post('/addDescription', fileController.addDescription);



describe("downloadFile controller", () => {
  it("should return 400 when userId or fileId is missing", async () => {
    const res = await request(app).post("/downloadFile").send({ userId: "user123" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing userId or fileId");
  });

  it("should stream a file successfully", async () => {
    const fileContent = "file content";
    const mockStream = new PassThrough();

    process.nextTick(() => {
      mockStream.write(fileContent);
      mockStream.end();
    });

    mockAxios.mockResolvedValueOnce({
      data: mockStream,
      headers: {
        "x-file-name": "sentFile.txt",
        "x-nonce": "nonce123",
      },
    });

    const res = await request(app)
      .post("/downloadFile")
      .send({ userId: "user123", fileId: "file456" })
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/octet-stream");
    expect(res.headers["x-file-name"]).toBe("sentFile.txt");
    expect(res.headers["x-nonce"]).toBe("nonce123");
    expect(res.body.toString()).toBe(fileContent);
  });

  it("should return 500 if headers are missing from Go service", async () => {
    const mockStream = new PassThrough();
    process.nextTick(() => mockStream.end());

    mockAxios.mockResolvedValueOnce({
      data: mockStream,
      headers: {}, // missing required headers
    });

    const res = await request(app)
      .post("/downloadFile")
      .send({ userId: "user123", fileId: "file456" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Missing required file metadata from service");
  });

  it("should handle axios errors", async () => {
    mockAxios.mockRejectedValueOnce(new Error("Network error"));

    const res = await request(app)
      .post("/downloadFile")
      .send({ userId: "user123", fileId: "file456" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Download failed");
  });
});
describe("downloadSentFile controller", () => {
  it("should return 400 when filepath is missing", async () => {
    const res = await request(app).post("/downloadSentFile").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("File path is required");
  });

  it("should stream a sent file successfully", async () => {
    const fileContent = "hello sent file";
    const filepath = "folder/sentFile.txt";
    const mockStream = new PassThrough();

    // Emit file content then end
    process.nextTick(() => {
      mockStream.write(fileContent);
      mockStream.end();
    });

    mockAxios.mockResolvedValueOnce({
      data: mockStream,
    });

    const res = await request(app)
      .post("/downloadSentFile")
      .send({ filepath })
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/octet-stream");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="sentFile.txt"');
    expect(res.body.toString()).toBe(fileContent);
  });

  it("should handle axios errors gracefully", async () => {
    mockAxios.mockRejectedValueOnce(new Error("Network error"));
    const res = await request(app)
      .post("/downloadSentFile")
      .send({ filepath: "folder/sentFile.txt" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Error retrieving the sent file");
  });

  it("should handle stream errors gracefully", async () => {
    const filepath = "folder/sentFile.txt";
    const mockStream = new PassThrough();

    mockAxios.mockResolvedValueOnce({
      data: mockStream,
    });

    const reqPromise = request(app)
      .post("/downloadSentFile")
      .send({ filepath })
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    // Trigger stream error
    setTimeout(() => mockStream.emit("error", new Error("Stream failed")), 10);

    const res = await reqPromise;

    // Stream errors close connection; status 200 already sent
    expect(res.status).toBe(200);
  });
});
describe("downloadViewFile controller", () => {
  it("should return 400 if userId or fileId is missing", async () => {
    const res = await request(app).post("/downloadViewFile").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("Missing userId or fileId");
  });

  it("should stream the view-only file successfully", async () => {
    const mockStream = new PassThrough();
    const fileContent = "streamed content";

    // Simulate file data being streamed
    process.nextTick(() => {
      mockStream.write(fileContent);
      mockStream.end();
    });

    // ✅ Fix: mock axios function, not axios.post
    mockAxios.mockResolvedValueOnce({
      data: mockStream,
      headers: {
        "x-view-only": "true",
        "x-file-id": "file123",
        "x-share-id": "share456",
      },
    });

    const res = await request(app)
      .post("/downloadViewFile")
      .send({ userId: "user123", fileId: "file123" })
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["x-view-only"]).toBe("true");
    expect(res.body.toString()).toBe(fileContent);
  });
});
describe("getMetaData controller", () => {
  it("should return 400 if userId is missing", async () => {
    const res = await request(app).post("/getMetaData").send({});
    expect(res.status).toBe(400);
    expect(res.text).toBe("User ID is required");
  });

  it("should return metadata list if request is successful", async () => {
    const mockData = [{ fileId: "file1", name: "test.pdf" }];
    mockAxios.post.mockResolvedValueOnce({
      status: 200,
      data: mockData,
    });

    const res = await request(app).post("/getMetaData").send({ userId: "user123" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockData);
  });

  it("should return error if external service responds with non-200", async () => {
    mockAxios.post.mockResolvedValueOnce({ status: 404 });

    const res = await request(app).post("/getMetaData").send({ userId: "user123" });
    expect(res.status).toBe(404);
    expect(res.text).toBe("Error retrieving metadata");
  });

  it("should return 500 if axios throws an error", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Connection failed"));

    const res = await request(app).post("/getMetaData").send({ userId: "user123" });
    expect(res.status).toBe(500);
    expect(res.text).toBe("Error retrieving metadata");
  });
});
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
      .attach("file", fileBuffer, "test.txt"); // only fileName and file attached

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
      .attach("file", fileBuffer, "test.txt");

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
      .attach("file", fileBuffer, "test.txt");

    expect(res.status).toBe(500);
    expect(res.text).toBe("Upload failed");
  });
});
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
describe("sendByView", () => {
  const buffer = Buffer.from("test file content"); // must be a Buffer

  it("should return 400 if required fields missing", async () => {
    const res = await request(app)
      .post("/sendByView")
      .attach("encryptedFile", buffer, "chunk.bin") // upload file
      .field({
        fileid: "file123",
        userId: "user123",
        recipientUserId: "recipient456"
        // missing metadata, chunkIndex, totalChunks
      });

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
        recipientUserId: "recipient456",
        metadata: JSON.stringify({ info: "test" }),
        chunkIndex: 1,
        totalChunks: 1,
      });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to send file by view");
  });
});
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
    expect(res.text.replace(/^"|"$/g, '')).toBe("File soft deleted");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app).post("/softDeleteFile").send({ fileId: "file123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Failed to soft delete file");
  });
});
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
    expect(res.text.replace(/^"|"$/g, '')).toBe("File restored");
  });

  it("should return 500 if axios fails", async () => {
    mockAxios.post.mockRejectedValueOnce(new Error("Failed"));

    const res = await request(app).post("/restoreFile").send({ fileId: "file123" });

    expect(res.status).toBe(500);
    expect(res.text).toBe("Restore failed");
  });
});
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
  });
});
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
  });
});