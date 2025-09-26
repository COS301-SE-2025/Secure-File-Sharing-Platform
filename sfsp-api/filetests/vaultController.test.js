// VaultController.test.js
const axios = require('axios');
const vaultController = require('../controllers/vaultController');
jest.mock('axios');



describe('VaultController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return health data from vault', async () => {
      const mockData = { status: 'ok' };
      axios.get.mockResolvedValue({ data: mockData });

      const result = await vaultController.healthCheck();

      expect(axios.get).toHaveBeenCalledWith('http://localhost:8443/health');
      expect(result).toEqual(mockData);
    });
  });

  describe('storeKeyBundle', () => {
    it('should POST key bundle to vault', async () => {
      const bundle = { key: 'xyz', metadata: { user: 'user1' } };
      const mockResponse = { success: true };

      axios.post.mockResolvedValue({ data: mockResponse });

      const result = await vaultController.storeKeyBundle(bundle);

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8443/store-key',
        bundle,
        { headers: { 'Content-Type': 'application/json' } }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('retrieveKeyBundle', () => {
    it('should GET key bundle using encrypted_id', async () => {
      const encrypted_id = 'abc123';
      const mockResponse = { key: 'encryptedKey' };

      axios.get.mockResolvedValue({ data: mockResponse });

      const result = await vaultController.retrieveKeyBundle(encrypted_id);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:8443/keys/abc123',
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteKeyBundle', () => {
    it('should DELETE key bundle using encrypted_id', async () => {
      const encrypted_id = 'abc123';
      const mockResponse = { deleted: true };

      axios.delete.mockResolvedValue({ data: mockResponse });

      const result = await vaultController.deleteKeyBundle(encrypted_id);

      expect(axios.delete).toHaveBeenCalledWith(
        'http://localhost:8443/keys/abc123',
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
