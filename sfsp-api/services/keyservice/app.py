from flask import Flask
from routes.key_routes import key_bp
from utils.error_handlers import not_found, method_not_allowed
import logging

app = Flask(__name__)

app.register_blueprint(key_bp)

app.register_error_handler(404, not_found)
app.register_error_handler(405, method_not_allowed)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    import os
    port = int(os.getenv('FLASK_PORT', 8443))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    print(f"Starting Flask application on port {port}")
    print(f"Debug mode: {debug}")
    app.run(host='0.0.0.0', port=port, debug=debug)
