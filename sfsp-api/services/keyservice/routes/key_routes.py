from flask import Blueprint, request, jsonify, current_app
from services.vault_service import get_vault_client

key_bp = Blueprint('key', __name__)


@key_bp.route('/')
def root():
    return jsonify({
        "message": "Hello from Flask root",
        "status": "success"
    }), 200


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


@key_bp.route('/store-key', methods=['POST'])
def store_private_key():
    vault = get_vault_client()
    if not vault:
        return jsonify({'status': 'error', 'error': 'Vault client not initialized'}), 500
    try:
        data = request.get_json()
        if not data or 'encrypted_id' not in data or \
                'spk_private_key' not in data or 'ik_private_key' not in data or 'opks_private' not in data:
            return jsonify({
                'status': 'error',
                'error': (
                    'Missing required fields: encrypted_id, ik_private_key, spk_private_key, '
                    'and opks_private'
                )
            }), 400

        encrypted_id = data['encrypted_id']
        ik_private_key = data['ik_private_key']
        spk_private_key = data['spk_private_key']
        opks_private = data['opks_private']
        if not encrypted_id or not spk_private_key or not ik_private_key or not isinstance(opks_private, list):
            return jsonify({
                'status': 'error',
                'error': (
                    'encrypted_id, ik_private_key, spk_private_key cannot be empty and '
                    'opks_private must be a list'
                )
            }), 400

        success = vault.write_private_key_bundle(
            encrypted_id, spk_private_key, ik_private_key, opks_private
        )

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
        current_app.logger.error(f"Error in store_private_key: {e}")
        return jsonify({
            'status': 'error',
            'error': 'Internal server error'
        }), 500


@key_bp.route('/retrieve-key', methods=['GET'])
def retrieve_private_key():
    vault = get_vault_client()
    if not vault:
        return jsonify({
            'status': 'error',
            'error': 'Vault client not initialized'
        }), 500
    try:
        data = request.get_json()
        if not data or 'encrypted_id' not in data:
            return jsonify({
                'status': 'error',
                'error': 'Missing required field: encrypted_id'
            }), 400
        encrypted_id = data['encrypted_id']
        if not encrypted_id:
            return jsonify({
                'status': 'error',
                'error': 'encrypted_id cannot be empty'
            }), 400
        result = vault.read_private_key_bundle(encrypted_id)
        if result:
            return jsonify({
                'status': 'success',
                'ik_private_key': result.get('ik_private_key'),
                'spk_private_key': result.get('spk_private_key'),
                'opks_private': result.get('opks_private'),
                'id': (
                    encrypted_id[:8] + '...'
                )
            }), 200
        else:
            return jsonify({'status': 'error', 'error': 'Key bundle not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Error in retrieve_private_key: {e}")
        return jsonify({'status': 'error', 'error': 'Internal server error'}), 500


@key_bp.route('/delete-key', methods=['DELETE'])
def delete_private_key():
    vault = get_vault_client()
    if not vault:
        return jsonify({
            'status': 'error',
            'error': 'Vault client not initialized'
        }), 500
    try:
        data = request.get_json()
        if not data or 'encrypted_id' not in data:
            return jsonify({
                'status': 'error',
                'error':  'Missing required field: encrypted_id'
            }), 400
        encrypted_id = data['encrypted_id']
        if not encrypted_id:
            return jsonify({'status': 'error', 'error': 'encrypted_id cannot be empty'}), 400
        success = vault.delete_private_key(encrypted_id)
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Key bundle deleted successfully',
                'id': (
                    encrypted_id[:8] + '...'
                )
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'error': 'Failed to delete key bundle or key not found'
            }), 404
    except Exception as e:
        current_app.logger.error(f"Error in delete_private_key: {e}")
        return jsonify({'status': 'error', 'error': 'Internal server error'}), 500