import json
from tests.test_base import KeyServiceTestCase


class TestRetrieveKeyEndpoint(KeyServiceTestCase):
    """Test cases for the retrieve-key endpoint."""

    def test_retrieve_key_success(self):
        """Test successful key bundle retrieval."""
        # First store a key bundle
        test_id = 'test-user-id-789012'
        test_data = {
            'ik_private_key': 'test-ik-private-key',
            'spk_private_key': 'test-spk-private-key',
            'opks_private': [
                {
                    'opk_id': 'opk-id-1',
                    'private_key': 'test-opk-private-key-1'
                }
            ]
        }

        # Store the key bundle directly using the mock
        self.vault_client_mock.write_private_key_bundle(
            test_id,
            test_data['spk_private_key'],
            test_data['ik_private_key'],
            test_data['opks_private']
        )

        # Then retrieve it
        response = self.client.get(f'/api/vault/keys/{test_id}')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['data']['spk_private_key'], test_data['spk_private_key'])
        self.assertEqual(data['data']['ik_private_key'], test_data['ik_private_key'])
        self.assertEqual(data['data']['opks_private'], test_data['opks_private'])
        self.assertIn('id', data)

    def test_retrieve_key_not_found(self):
        """Test retrieve key that doesn't exist."""
        response = self.client.get('/api/vault/keys/nonexistent-id')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error'], 'Key bundle not found')

    def test_retrieve_key_empty_id(self):
        """Test retrieve key with empty id."""
        response = self.client.get('/api/vault/keys/')

        # This should return 404 or 405 depending on Flask routing
        self.assertIn(response.status_code, [404, 405])