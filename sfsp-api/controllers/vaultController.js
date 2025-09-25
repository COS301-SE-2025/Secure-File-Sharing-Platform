const axios = require('axios');
require('dotenv').config();

class VaultController {

    async healthCheck() {
        const apiUrl = process.env.KEY_SERVICE_URL || 'http://localhost:8443';
        const res = await axios.get(`${apiUrl}/health`);
        return res.data;
    }

    async storeKeyBundle(bundle) {
        const apiUrl = process.env.KEY_SERVICE_URL || 'http://localhost:8443';
        const res = await axios.post(`${apiUrl}/store-key`, bundle, {
            headers: { 'Content-Type': 'application/json' }
        });
        return res.data;
    }

    async retrieveKeyBundle(encrypted_id) {
        const apiUrl = process.env.KEY_SERVICE_URL || 'http://localhost:8443';
        const res = await axios.get(`${apiUrl}/retrieve-key`, {
            headers: { 'Content-Type': 'application/json' },
            data: { encrypted_id }
        });
        return res.data;
    }

    async deleteKeyBundle(encrypted_id) {
        const apiUrl = process.env.KEY_SERVICE_URL || 'http://localhost:8443';
        const res = await axios.delete(`${apiUrl}/delete-key`, {
            headers: { 'Content-Type': 'application/json' },
            data: { encrypted_id }
        });
        return res.data;
    }
}

module.exports = new VaultController();
