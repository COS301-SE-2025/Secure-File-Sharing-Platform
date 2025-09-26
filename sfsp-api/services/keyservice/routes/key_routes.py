from flask import Blueprint, request, jsonify, current_app
from services.vault_service import get_vault_client

key_bp = Blueprint('key', __name__, url_prefix='/api/vault')


@key_bp.route('/health', methods=['GET'])
def health_check():
    vault = get_vault_client()
    vault_status = (
        "connected" if vault and vault.client.is_authenticated()
        else "disconnected"
    )
    return jsonify({
        'status': 'success',
        'health': {
            'status': 'healthy',
            'vault_status': vault_status
        }
    }), 200


@key_bp.route('/keys', methods=['POST'])
def store_private_key():
    """Store a private key bundle"""
    print("Inside the store_private key function")
    vault = get_vault_client()
    if not vault:
        return jsonify({'status': 'error', 'error': 'Vault client not initialized'}), 500
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'error': 'Request body must be valid JSON'
            }), 400

        # Validate required fields
        required_fields = ['encrypted_id', 'spk_private_key', 'ik_private_key', 'opks_private']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'status': 'error',
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400

        encrypted_id = data['encrypted_id']
        ik_private_key = data['ik_private_key']
        spk_private_key = data['spk_private_key']
        opks_private = data['opks_private']

        # Validate field values
        if not encrypted_id or not spk_private_key or not ik_private_key:
            return jsonify({
                'status': 'error',
                'error': 'encrypted_id, ik_private_key, and spk_private_key cannot be empty'
            }), 400

        if not isinstance(opks_private, list):
            return jsonify({
                'status': 'error',
                'error': 'opks_private must be a list'
            }), 400

        success = vault.write_private_key_bundle(
            encrypted_id, spk_private_key, ik_private_key, opks_private
        )
        
        print("Return from store")
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Key bundle stored successfully',
                'id': encrypted_id[:8] + '...'
            }), 201
        else:
            return jsonify({
                'status': 'error',
                'error': 'Failed to store key bundle'
            }), 500

    except Exception as e:
        print("Inside the exception as e")
        current_app.logger.error(f"Error in store_private_key: {e}")
        return jsonify({
            'status': 'error',
            'error': 'Internal server error'
        }), 500


@key_bp.route('/keys/<encrypted_id>', methods=['GET'])
def retrieve_private_key(encrypted_id):
    """Retrieve a private key bundle by encrypted_id"""
    vault = get_vault_client()
    if not vault:
        return jsonify({
            'status': 'error',
            'error': 'Vault client not initialized'
        }), 500
    
    try:
        if not encrypted_id:
            return jsonify({
                'status': 'error',
                'error': 'encrypted_id cannot be empty'
            }), 400

        result = vault.read_private_key_bundle(encrypted_id)
        if result:
            return jsonify({
                'status': 'success',
                'data': {
                    'ik_private_key': result.get('ik_private_key'),
                    'spk_private_key': result.get('spk_private_key'),
                    'opks_private': result.get('opks_private')
                },
                'id': encrypted_id[:8] + '...'
            }), 200
        else:
            return jsonify({
                'status': 'error', 
                'error': 'Key bundle not found'
            }), 404
            
    except Exception as e:
        current_app.logger.error(f"Error in retrieve_private_key: {e}")
        return jsonify({
            'status': 'error', 
            'error': 'Internal server error'
        }), 500


@key_bp.route('/keys/<encrypted_id>', methods=['DELETE'])
def delete_private_key(encrypted_id):
    """Delete a private key bundle by encrypted_id"""
    vault = get_vault_client()
    if not vault:
        return jsonify({
            'status': 'error',
            'error': 'Vault client not initialized'
        }), 500
    
    try:
        if not encrypted_id:
            return jsonify({
                'status': 'error',
                'error': 'encrypted_id cannot be empty'
            }), 400

        success = vault.delete_private_key(encrypted_id)
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Key bundle deleted successfully',
                'id': encrypted_id[:8] + '...'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'error': 'Failed to delete key bundle or key not found'
            }), 404
            
    except Exception as e:
        current_app.logger.error(f"Error in delete_private_key: {e}")
        return jsonify({
            'status': 'error', 
            'error': 'Internal server error'
        }), 500