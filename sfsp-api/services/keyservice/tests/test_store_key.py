import json
from tests.test_base import KeyServiceTestCase

class TestHealthEndpoint(KeyServiceTestCase):
    """Test cases for the health endpoint."""

    def test_health_check(self):
        """Test that the health check endpoint returns the correct response."""
        response = self.client.get('/health')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['health']['status'], 'healthy')
        self.assertEqual(data['health']['vault_status'], 'connected')


class TestStoreKeyEndpoint(KeyServiceTestCase):
    """Test cases for the store-key endpoint."""

    def test_store_key_success(self):
        """Test successful key bundle storage."""
        test_data = {
            'encrypted_id': 'test-user-id-123456',
            'ik_private_key': 'test-ik-private-key',
            'spk_private_key': 'test-spk-private-key',
            'opks_private': [
                {
                    'opk_id': 'opk-id-1',
                    'private_key': 'test-opk-private-key-1'
                }
            ]
        }
        
        response = self.client.post(
            '/store-key',
            data=json.dumps(test_data),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['message'], 'Key bundle stored successfully')
        self.assertIn('id', data)

    def test_store_key_missing_fields(self):
        """Test store key with missing required fields."""
        # Missing ik_private_key
        test_data = {
            'encrypted_id': 'test-user-id-123456',
            'spk_private_key': 'test-spk-private-key',
            'opks_private': []
        }
        
        response = self.client.post(
            '/store-key',
            data=json.dumps(test_data),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)

    def test_store_key_empty_values(self):
        """Test store key with empty values."""
        test_data = {
            'encrypted_id': '',
            'ik_private_key': 'test-ik-private-key',
            'spk_private_key': 'test-spk-private-key',
            'opks_private': []
        }
        
        response = self.client.post(
            '/store-key',
            data=json.dumps(test_data),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)
