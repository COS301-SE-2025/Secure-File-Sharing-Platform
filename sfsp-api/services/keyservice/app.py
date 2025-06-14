from flask import Flask, request, jsonify
import hvac
import os
from dotenv import load_dotenv
import logging

load_dotenv()

app = Flask(__name__)

@app.route('/')
def root():
    return jsonify({"message": "Hello from Flask root"})

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VaultClient:
    def __init__(self, url=None, token=None):
        self.url = url or os.getenv('VAULT_URL', 'http://localhost:8200')
        self.token = token or os.getenv('VAULT_TOKEN')
        
        if not self.token:
            raise ValueError("Vault token must be provided via VAULT_TOKEN environment variable")
        
        self.client = hvac.Client(url=self.url, token=self.token)
        
        try:
            assert self.client.is_authenticated()
            logger.info(f"Successfully authenticated with Vault at {self.url}")
        except Exception as e:
            logger.error(f"Failed to authenticate with Vault: {e}")
            raise

    def write_private_key(self, encrypted_id, encrypted_private_key):
        """Store encrypted private key using encrypted ID as the path identifier"""
        path = f'userkeys/{encrypted_id}'
        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret={'encrypted_private_key': encrypted_private_key}
            )
            logger.info(f"Successfully stored private key for ID: {encrypted_id[:8]}...")
            return True
        except Exception as e:
            logger.error(f"Failed to store private key: {e}")
            return False

    def read_private_key(self, encrypted_id):
        """Retrieve encrypted private key using encrypted ID"""
        path = f'userkeys/{encrypted_id}'
        try:
            read_response = self.client.secrets.kv.v2.read_secret_version(path=path)
            logger.info(f"Successfully retrieved private key for ID: {encrypted_id[:8]}...")
            return read_response['data']['data']
        except Exception as e:
            logger.error(f"Failed to retrieve private key: {e}")
            return None

    def delete_private_key(self, encrypted_id):
        """Delete encrypted private key using encrypted ID"""
        path = f'userkeys/{encrypted_id}'
        try:
            self.client.secrets.kv.v2.delete_metadata_and_all_versions(path=path)
            logger.info(f"Successfully deleted private key for ID: {encrypted_id[:8]}...")
            return True
        except Exception as e:
            logger.error(f"Failed to delete private key: {e}")
            return False

try:
    vault = VaultClient()
except Exception as e:
    logger.error(f"Failed to initialize Vault client: {e}")
    vault = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    vault_status = "connected" if vault and vault.client.is_authenticated() else "disconnected"
    return jsonify({
        'status': 'healthy',
        'vault_status': vault_status
    })

@app.route('/store-key', methods=['POST'])
def store_private_key():
    """Store an encrypted private key"""
    if not vault:
        return jsonify({'error': 'Vault client not initialized'}), 500
    
    try:
        data = request.get_json()
        
        if not data or 'encrypted_id' not in data or 'encrypted_private_key' not in data:
            return jsonify({
                'error': 'Missing required fields: encrypted_id and encrypted_private_key'
            }), 400
        
        encrypted_id = data['encrypted_id']
        encrypted_private_key = data['encrypted_private_key']
        
        # Validate inputs
        if not encrypted_id or not encrypted_private_key:
            return jsonify({'error': 'encrypted_id and encrypted_private_key cannot be empty'}), 400
        
        success = vault.write_private_key(encrypted_id, encrypted_private_key)
        
        if success:
            return jsonify({
                'message': 'Private key stored successfully',
                'id': encrypted_id[:8] + '...'  # Return partial ID for confirmation
            }), 201
        else:
            return jsonify({'error': 'Failed to store private key'}), 500
            
    except Exception as e:
        logger.error(f"Error in store_private_key: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/retrieve-key', methods=['GET'])
def retrieve_private_key():
    """Retrieve an encrypted private key"""
    if not vault:
        return jsonify({'error': 'Vault client not initialized'}), 500
    
    try:
        data = request.get_json()
        
        if not data or 'encrypted_id' not in data:
            return jsonify({'error': 'Missing required field: encrypted_id'}), 400
        
        encrypted_id = data['encrypted_id']
        
        if not encrypted_id:
            return jsonify({'error': 'encrypted_id cannot be empty'}), 400
        
        result = vault.read_private_key(encrypted_id)
        
        if result:
            return jsonify({
                'encrypted_private_key': result['encrypted_private_key'],
                'id': encrypted_id[:8] + '...'
            }), 200
        else:
            return jsonify({'error': 'Private key not found'}), 404
            
    except Exception as e:
        logger.error(f"Error in retrieve_private_key: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/delete-key', methods=['DELETE'])
def delete_private_key():
    """Delete an encrypted private key"""
    if not vault:
        return jsonify({'error': 'Vault client not initialized'}), 500
    
    try:
        data = request.get_json()
        
        if not data or 'encrypted_id' not in data:
            return jsonify({'error': 'Missing required field: encrypted_id'}), 400
        
        encrypted_id = data['encrypted_id']
        
        if not encrypted_id:
            return jsonify({'error': 'encrypted_id cannot be empty'}), 400
        
        success = vault.delete_private_key(encrypted_id)
        
        if success:
            return jsonify({
                'message': 'Private key deleted successfully',
                'id': encrypted_id[:8] + '...'
            }), 200
        else:
            return jsonify({'error': 'Failed to delete private key or key not found'}), 404
            
    except Exception as e:
        logger.error(f"Error in delete_private_key: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 8080))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"Starting Flask application on port {port}")
    print(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )