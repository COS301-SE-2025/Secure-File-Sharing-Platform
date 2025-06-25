import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import json

# Add the parent directory to sys.path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

class TestConfig:
    """Test configuration for the Flask app."""
    TESTING = True
    DEBUG = False

class VaultClientMock:
    """Mock for the VaultClient class."""
    def __init__(self):
        self.client = MagicMock()
        self.client.is_authenticated.return_value = True
        self.storage = {}  # In-memory storage for testing

    def write_private_key_bundle(self, encrypted_id, spk_private_key, ik_private_key, opks_private):
        """Mock for storing key bundle."""
        self.storage[encrypted_id] = {
            'spk_private_key': spk_private_key,
            'ik_private_key': ik_private_key,
            'opks_private': opks_private
        }
        return True

    def read_private_key_bundle(self, encrypted_id):
        """Mock for retrieving key bundle."""
        if encrypted_id in self.storage:
            return self.storage[encrypted_id]
        return None

    def delete_private_key(self, encrypted_id):
        """Mock for deleting key bundle."""
        if encrypted_id in self.storage:
            del self.storage[encrypted_id]
            return True
        return False

class KeyServiceTestCase(unittest.TestCase):
    """Base test case class for keyservice tests."""
    
    def setUp(self):
        """Set up test client and mock objects before each test."""
        app.config.from_object(TestConfig)
        self.client = app.test_client()
        self.vault_client_mock = VaultClientMock()
        
        # Create a patcher for the get_vault_client function
        self.get_vault_patcher = patch('routes.key_routes.get_vault_client')
        self.mock_get_vault = self.get_vault_patcher.start()
        self.mock_get_vault.return_value = self.vault_client_mock

    def tearDown(self):
        """Clean up after each test."""
        self.get_vault_patcher.stop()


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
