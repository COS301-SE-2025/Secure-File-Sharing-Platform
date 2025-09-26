require('dotenv').config();
const axios = require('axios');

/**
 * VaultController - A controller class to interact with the Flask Vault API
 */
class VaultController {
    /**
     * Initialize VaultController
     * @param {string} baseURL - Base URL for the Flask API (default: 'http://localhost:5000')
     * @param {number} timeout - Request timeout in milliseconds (default: 30000)
     */
    constructor(baseURL = process.env.KEY_SERVICE_URL || 'http://localhost:8443', timeout = 30000) {
        this.baseURL = baseURL;
        this.apiClient = axios.create({
            baseURL: `${baseURL}/api/vault`,
            timeout: timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Add request interceptor for logging
        this.apiClient.interceptors.request.use(
            (config) => {
                console.log(`Making ${config.method.toUpperCase()} request to: ${config.url}`);
                return config;
            },
            (error) => {
                console.error('Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging and error handling
        this.apiClient.interceptors.response.use(
            (response) => {
                console.log(`Response received: ${response.status} ${response.statusText}`);
                return response;
            },
            (error) => {
                console.error('Response interceptor error:', error.response?.data || error.message);
                return Promise.reject(this._formatError(error));
            }
        );
    }

    /**
     * Format error response for consistent error handling
     * @private
     * @param {Error} error - Axios error object
     * @returns {Object} Formatted error object
     */
    _formatError(error) {
        if (error.response) {
            // Server responded with error status
            return {
                status: 'error',
                statusCode: error.response.status,
                message: error.response.data?.error || error.response.statusText,
                data: error.response.data
            };
        } else if (error.request) {
            // Request was made but no response received
            return {
                status: 'error',
                statusCode: 0,
                message: 'No response from server',
                data: null
            };
        } else {
            // Something else happened
            return {
                status: 'error',
                statusCode: 0,
                message: error.message,
                data: null
            };
        }
    }

    /**
     * Check health status of the Vault service
     * @returns {Promise<Object>} Health check response
     */
    async healthCheck() {
        try {
            const response = await this.apiClient.get('/health');
            return {
                status: 'success',
                data: response.data,
                statusCode: response.status
            };
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    /**
     * Store a private key bundle in Vault
     * @param {Object} keyBundle - Key bundle object
     * @param {string} keyBundle.encrypted_id - Encrypted user ID
     * @param {string} keyBundle.spk_private_key - Signed pre-key private key
     * @param {string} keyBundle.ik_private_key - Identity key private key
     * @param {Array} keyBundle.opks_private - Array of one-time pre-keys
     * @returns {Promise<Object>} Store operation response
     */
    async storeKeyBundle(keyBundle) {
        try {
            // Validate input
            const requiredFields = ['encrypted_id', 'spk_private_key', 'ik_private_key', 'opks_private'];
            const missingFields = requiredFields.filter(field => !keyBundle.hasOwnProperty(field));
            
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            if (!Array.isArray(keyBundle.opks_private)) {
                throw new Error('opks_private must be an array');
            }

            const response = await this.apiClient.post('/keys', keyBundle);
            return {
                status: 'success',
                data: response.data,
                statusCode: response.status
            };
        } catch (error) {
            console.error('Store key bundle failed:', error);
            throw error;
        }
    }

    /**
     * Retrieve a private key bundle from Vault
     * @param {string} encryptedId - Encrypted user ID
     * @returns {Promise<Object>} Retrieve operation response
     */
    async retrieveKeyBundle(encryptedId) {
        try {
            if (!encryptedId || typeof encryptedId !== 'string') {
                throw new Error('encrypted_id must be a non-empty string');
            }

            const response = await this.apiClient.get(`/keys/${encryptedId}`);
            return {
                status: 'success',
                data: response.data,
                statusCode: response.status
            };
        } catch (error) {
            console.error('Retrieve key bundle failed:', error);
            throw error;
        }
    }

    /**
     * Delete a private key bundle from Vault
     * @param {string} encryptedId - Encrypted user ID
     * @returns {Promise<Object>} Delete operation response
     */
    async deleteKeyBundle(encryptedId) {
        try {
            if (!encryptedId || typeof encryptedId !== 'string') {
                throw new Error('encrypted_id must be a non-empty string');
            }

            const response = await this.apiClient.delete(`/keys/${encryptedId}`);
            return {
                status: 'success',
                data: response.data,
                statusCode: response.status
            };
        } catch (error) {
            console.error('Delete key bundle failed:', error);
            throw error;
        }
    }

    /**
     * Check if the Vault service is available
     * @returns {Promise<boolean>} True if service is available
     */
    async isServiceAvailable() {
        try {
            const health = await this.healthCheck();
            return health.data.health.status === 'healthy';
        } catch (error) {
            return false;
        }
    }

    /**
     * Get Vault connection status
     * @returns {Promise<string>} Vault connection status
     */
    async getVaultStatus() {
        try {
            const health = await this.healthCheck();
            return health.data.health.vault_status;
        } catch (error) {
            return 'unknown';
        }
    }
}

module.exports = VaultController;