require("dotenv").config();
const axios = require("axios");

class VaultController {
  constructor(
    baseURL = process.env.KEY_SERVICE_URL || "http://localhost:8443",
    timeout = 30000
  ) {
    this.baseURL = baseURL;

    this.apiClient = axios.create({
      baseURL: `${baseURL}/api/vault`,
      timeout: timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.apiClient.interceptors.request.use(
      (config) => {
        console.log(
          `Making ${config.method.toUpperCase()} request to: ${config.url}`
        );
        return config;
      },
      (error) => {
        console.error("Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        console.log(
          `Response received: ${response.status} ${response.statusText}`
        );
        return response;
      },
      (error) => {
        console.error(
          "Response interceptor error:",
          error.response?.data || error.message
        );
        return Promise.reject(this._formatError(error));
      }
    );
  }

  _formatError(error) {
    if (error.response) {
      return {
        status: "error",
        statusCode: error.response.status,
        message: error.response.data?.error || error.response.statusText,
        data: error.response.data,
      };
    } else if (error.request) {
      return {
        status: "error",
        statusCode: 0,
        message: "No response from server",
        data: null,
      };
    } else {
      return {
        status: "error",
        statusCode: 0,
        message: error.message,
        data: null,
      };
    }
  }

  async healthCheck() {
    try {
      const response = await this.apiClient.get("/health");
      return {
        status: "success",
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }

  async storeKeyBundle(keyBundle) {
    try {
      const requiredFields = [
        "encrypted_id",
        "spk_private_key",
        "ik_private_key",
        "opks_private",
      ];
      const missingFields = requiredFields.filter(
        (field) => !Object.prototype.hasOwnProperty.call(keyBundle, field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      if (!Array.isArray(keyBundle.opks_private)) {
        throw new Error("opks_private must be an array");
      }

      const response = await this.apiClient.post("/keys", keyBundle);
      return {
        status: "success",
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      console.error("Store key bundle failed:", error);
      throw error;
    }
  }

  async retrieveKeyBundle(encryptedId) {
    try {
      if (!encryptedId || typeof encryptedId !== "string") {
        throw new Error("encrypted_id must be a non-empty string");
      }

      const response = await this.apiClient.get(`/keys/${encryptedId}`);
      return {
        status: "success",
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      console.error("Retrieve key bundle failed:", error);
      throw error;
    }
  }

  async deleteKeyBundle(encryptedId) {
    try {
      if (!encryptedId || typeof encryptedId !== "string") {
        throw new Error("encrypted_id must be a non-empty string");
      }

      const response = await this.apiClient.delete(`/keys/${encryptedId}`);
      return {
        status: "success",
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      console.error("Delete key bundle failed:", error);
      throw error;
    }
  }

  async isServiceAvailable() {
    try {
      const health = await this.healthCheck();
      return health.data.health.status === "healthy";
    } catch {
      return false;
    }
  }

  async getVaultStatus() {
    try {
      const health = await this.healthCheck();
      return health.data.health.vault_status;
    } catch {
      return "unknown";
    }
  }
}

module.exports = VaultController;
