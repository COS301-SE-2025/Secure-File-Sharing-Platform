import json
from tests.test_base import KeyServiceTestCase

class TestDeleteKeyEndpoint(KeyServiceTestCase):
    """Test cases for the delete-key endpoint."""

    def test_delete_key_success(self):
        """Test successful key bundle deletion."""
        # First store a key bundle
        test_id = 'test-user-id-345678'
        test_data = {
            'encrypted_id': test_id,
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
        response = self.client.delete(
            '/delete-key',
            data=json.dumps({'encrypted_id': test_id}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['message'], 'Key bundle deleted successfully')
        self.assertIn('id', data)
        
        # Verify it's deleted by trying to retrieve it
        retrieve_response = self.client.get(
            '/retrieve-key',
            data=json.dumps({'encrypted_id': test_id}),
            content_type='application/json'
        )
        self.assertEqual(retrieve_response.status_code, 404)

    def test_delete_key_not_found(self):
        """Test delete key that doesn't exist."""
        response = self.client.delete(
            '/delete-key',
            data=json.dumps({'encrypted_id': 'nonexistent-id'}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 404)
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)

    def test_delete_key_missing_id(self):
        """Test delete key with missing id."""
        response = self.client.delete(
            '/delete-key',
            data=json.dumps({}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)
