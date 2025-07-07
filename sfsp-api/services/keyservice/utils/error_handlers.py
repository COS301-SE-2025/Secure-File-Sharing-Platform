from flask import jsonify


def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405