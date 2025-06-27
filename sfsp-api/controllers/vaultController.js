const axios = require('axios');

class VaultController {
    constructor() {
        this.apiUrl = 'http://localhost:8443';
    }

    async healthCheck() {
        const res = await axios.get(`${this.apiUrl}/health`);
        return res.data;
    }

    async storeKeyBundle(bundle) {
        const res = await axios.post(`${this.apiUrl}/store-key`, bundle, {
            headers: { 'Content-Type': 'application/json' }
        });
        return res.data;
    }

    async retrieveKeyBundle(encrypted_id) {
        const res = await axios.get(`${this.apiUrl}/retrieve-key`, {
            headers: { 'Content-Type': 'application/json' },
            data: { encrypted_id }
        });
        return res.data;
    }

    async deleteKeyBundle(encrypted_id) {
        const res = await axios.delete(`${this.apiUrl}/delete-key`, {
            headers: { 'Content-Type': 'application/json' },
            data: { encrypted_id }
        });
        return res.data;
    }
}

module.exports = new VaultController();