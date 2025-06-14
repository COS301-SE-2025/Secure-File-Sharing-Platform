from flask import Blueprint, request, jsonify, current_app
from services.vault_service import get_vault_client

key_bp = Blueprint('key', __name__)

@key_bp.route('/')
def root():
    return jsonify({"message": "Hello from Flask root"})

@key_bp.route('/health', methods=['GET'])
def health_check():
    vault = get_vault_client()
    vault_status = "connected" if vault and vault.client.is_authenticated() else "disconnected"
    return jsonify({
        'status': 'healthy',
        'vault_status': vault_status
    })

@key_bp.route('/store-key', methods=['POST'])
def store_private_key():
    vault = get_vault_client()
    if not vault:
        return jsonify({'error': 'Vault client not initialized'}), 500
    try:
        data = request.get_json()
        if not data or 'encrypted_id' not in data or 'encrypted_private_key' not in data:
            return jsonify({'error': 'Missing required fields: encrypted_id and encrypted_private_key'}), 400
        encrypted_id = data['encrypted_id']
        encrypted_private_key = data['encrypted_private_key']
        if not encrypted_id or not encrypted_private_key:
            return jsonify({'error': 'encrypted_id and encrypted_private_key cannot be empty'}), 400
        success = vault.write_private_key(encrypted_id, encrypted_private_key)
        if success:
            return jsonify({'message': 'Private key stored successfully','id': encrypted_id[:8] + '...'}), 201
        else:
            return jsonify({'error': 'Failed to store private key'}), 500
    except Exception as e:
        current_app.logger.error(f"Error in store_private_key: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@key_bp.route('/retrieve-key', methods=['GET'])
def retrieve_private_key():
    vault = get_vault_client()
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
            return jsonify({'encrypted_private_key': result['encrypted_private_key'],'id': encrypted_id[:8] + '...'}), 200
        else:
            return jsonify({'error': 'Private key not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Error in retrieve_private_key: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@key_bp.route('/delete-key', methods=['DELETE'])
def delete_private_key():
    vault = get_vault_client()
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
            return jsonify({'message': 'Private key deleted successfully','id': encrypted_id[:8] + '...'}), 200
        else:
            return jsonify({'error': 'Failed to delete private key or key not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Error in delete_private_key: {e}")
        return jsonify({'error': 'Internal server error'}), 500
