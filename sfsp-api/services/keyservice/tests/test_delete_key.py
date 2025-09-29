import json
from tests.test_base import KeyServiceTestCase


class TestDeleteKeyEndpoint(KeyServiceTestCase):
    """Test cases for the delete-key endpoint."""

    def test_delete_key_success(self):
        """Test successful key bundle deletion."""
        # First store a key bundle
        test_id = 'test-user-id-345678'
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

        # Then delete it
        response = self.client.delete(f'/api/vault/keys/{test_id}')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['message'], 'Key bundle deleted successfully')
        self.assertIn('id', data)

        # Verify it's deleted by trying to retrieve it
        retrieve_response = self.client.get(f'/api/vault/keys/{test_id}')
        self.assertEqual(retrieve_response.status_code, 404)

    def test_delete_key_not_found(self):
        """Test delete key that doesn't exist."""
        response = self.client.delete('/api/vault/keys/nonexistent-id')
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(data['status'], 'error')
        self.assertEqual(data['error'], 'Failed to delete key bundle or key not found')

    def test_delete_key_empty_id(self):
        """Test delete key with empty id."""
        response = self.client.delete('/api/vault/keys/')

        # This should return 404 or 405 depending on Flask routing
        self.assertIn(response.status_code, [404, 405])