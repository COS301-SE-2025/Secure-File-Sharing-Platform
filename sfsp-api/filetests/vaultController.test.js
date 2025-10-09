// VaultController.test.js
const axios = require('axios');
const VaultController = require('../controllers/vaultController');

jest.mock('axios');

describe('VaultController', () => {
  let vaultController;
  let mockApiClient;

  beforeEach(() => {
    // Create mock apiClient
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    // Mock axios.create to return our mock apiClient
    axios.create = jest.fn(() => mockApiClient);

    // Create a new instance of VaultController
    vaultController = new VaultController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return health data from vault', async () => {
      const mockData = { health: { status: 'healthy' } };
      mockApiClient.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK'
      });

      const result = await vaultController.healthCheck();

      expect(mockApiClient.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual({
        status: 'success',
        data: mockData,
        statusCode: 200
      });
    });
  });

  describe('storeKeyBundle', () => {
    it('should POST key bundle to vault', async () => {
      const bundle = {
        encrypted_id: 'user123',
        ik_private_key: 'ik_key',
        spk_private_key: 'spk_key',
        opks_private: ['opk1', 'opk2']
      };
      const mockResponse = { success: true, id: 'vault_id_123' };

      mockApiClient.post.mockResolvedValue({
        data: mockResponse,
        status: 201,
        statusText: 'Created'
      });

      const result = await vaultController.storeKeyBundle(bundle);

      expect(mockApiClient.post).toHaveBeenCalledWith('/keys', bundle);
      expect(result).toEqual({
        status: 'success',
        data: mockResponse,
        statusCode: 201
      });
    });

    it('should throw error when required fields are missing', async () => {
      const invalidBundle = {
        encrypted_id: 'user123',
        ik_private_key: 'ik_key'
        // Missing spk_private_key and opks_private
      };

      await expect(vaultController.storeKeyBundle(invalidBundle))
        .rejects.toThrow('Missing required fields');
    });

    it('should throw error when opks_private is not an array', async () => {
      const invalidBundle = {
        encrypted_id: 'user123',
        ik_private_key: 'ik_key',
        spk_private_key: 'spk_key',
        opks_private: 'not_an_array'
      };

      await expect(vaultController.storeKeyBundle(invalidBundle))
        .rejects.toThrow('opks_private must be an array');
    });
  });

  describe('retrieveKeyBundle', () => {
    it('should GET key bundle using encrypted_id', async () => {
      const encrypted_id = 'abc123';
      const mockResponse = {
        data: {
          ik_private_key: 'ik_key',
          spk_private_key: 'spk_key',
          opks_private: ['opk1', 'opk2']
        }
      };

      mockApiClient.get.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK'
      });

      const result = await vaultController.retrieveKeyBundle(encrypted_id);

      expect(mockApiClient.get).toHaveBeenCalledWith('/keys/abc123');
      expect(result).toEqual({
        status: 'success',
        data: mockResponse,
        statusCode: 200
      });
    });

    it('should throw error when encrypted_id is not provided', async () => {
      await expect(vaultController.retrieveKeyBundle())
        .rejects.toThrow('encrypted_id must be a non-empty string');
    });

    it('should throw error when encrypted_id is not a string', async () => {
      await expect(vaultController.retrieveKeyBundle(123))
        .rejects.toThrow('encrypted_id must be a non-empty string');
    });
  });

  describe('deleteKeyBundle', () => {
    it('should DELETE key bundle using encrypted_id', async () => {
      const encrypted_id = 'abc123';
      const mockResponse = { deleted: true, message: 'Key bundle deleted successfully' };

      mockApiClient.delete.mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK'
      });

      const result = await vaultController.deleteKeyBundle(encrypted_id);

      expect(mockApiClient.delete).toHaveBeenCalledWith('/keys/abc123');
      expect(result).toEqual({
        status: 'success',
        data: mockResponse,
        statusCode: 200
      });
    });

    it('should throw error when encrypted_id is not provided', async () => {
      await expect(vaultController.deleteKeyBundle())
        .rejects.toThrow('encrypted_id must be a non-empty string');
    });

    it('should throw error when encrypted_id is not a string', async () => {
      await expect(vaultController.deleteKeyBundle(123))
        .rejects.toThrow('encrypted_id must be a non-empty string');
    });
  });

  describe('isServiceAvailable', () => {
    it('should return true when service is healthy', async () => {
      const mockData = { health: { status: 'healthy' } };
      mockApiClient.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK'
      });

      const result = await vaultController.isServiceAvailable();

      expect(result).toBe(true);
    });

    it('should return false when service is not healthy', async () => {
      const mockData = { health: { status: 'unhealthy' } };
      mockApiClient.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK'
      });

      const result = await vaultController.isServiceAvailable();

      expect(result).toBe(false);
    });

    it('should return false when health check fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await vaultController.isServiceAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getVaultStatus', () => {
    it('should return vault status when available', async () => {
      const mockData = { health: { vault_status: 'sealed' } };
      mockApiClient.get.mockResolvedValue({
        data: mockData,
        status: 200,
        statusText: 'OK'
      });

      const result = await vaultController.getVaultStatus();

      expect(result).toBe('sealed');
    });

    it('should return "unknown" when health check fails', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await vaultController.getVaultStatus();

      expect(result).toBe('unknown');
    });
  });
});
