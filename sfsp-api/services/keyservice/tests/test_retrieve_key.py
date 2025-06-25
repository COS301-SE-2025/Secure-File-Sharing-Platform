import json
from tests.test_base import KeyServiceTestCase

class TestRetrieveKeyEndpoint(KeyServiceTestCase):
    """Test cases for the retrieve-key endpoint."""

    def test_retrieve_key_success(self):
        """Test successful key bundle retrieval."""
        # First store a key bundle
        test_id = 'test-user-id-789012'
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
        
        # Then retrieve it
        response = self.client.get(
            '/retrieve-key',
            data=json.dumps({'encrypted_id': test_id}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['spk_private_key'], test_data['spk_private_key'])
        self.assertEqual(data['ik_private_key'], test_data['ik_private_key'])
        self.assertEqual(data['opks_private'], test_data['opks_private'])
        self.assertIn('id', data)

    def test_retrieve_key_not_found(self):
        """Test retrieve key that doesn't exist."""
        response = self.client.get(
            '/retrieve-key',
            data=json.dumps({'encrypted_id': 'nonexistent-id'}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 404)
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)

    def test_retrieve_key_missing_id(self):
        """Test retrieve key with missing id."""
        response = self.client.get(
            '/retrieve-key',
            data=json.dumps({}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)
