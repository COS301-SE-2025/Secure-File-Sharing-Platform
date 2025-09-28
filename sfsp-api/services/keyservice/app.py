from flask import Flask
from routes.key_routes import key_bp
from utils.error_handlers import not_found, method_not_allowed
import logging
import os

def create_app():
    app = Flask(__name__)

    app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
    app.config['ENV'] = os.getenv('FLASK_ENV', 'production')

    app.register_blueprint(key_bp)

    app.register_error_handler(404, not_found)
    app.register_error_handler(405, method_not_allowed)

    if not app.debug:
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s'
        )
    else:
        logging.basicConfig(level=logging.DEBUG)

    return app

app = create_app()
logger = logging.getLogger(__name__)

if __name__ == '__main__':
    import os
    port = int(os.getenv('FLASK_PORT', 8443))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    print(f"Starting Flask application on port {port}")
    print(f"Debug mode: {debug}")
    app.run(host='0.0.0.0', port=port, debug=debug)