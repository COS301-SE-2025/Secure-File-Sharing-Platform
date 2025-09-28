import os

# Server socket
bind = f"0.0.0.0:{os.getenv('FLASK_PORT', 8443)}"

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', 4))
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers after this many requests, to help prevent memory leaks
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv('LOG_LEVEL', 'info').lower()

# Process naming
proc_name = 'keyservice'

# Server mechanics
daemon = False
pidfile = '/tmp/keyservice.pid'
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = "path/to/keyfile"
# certfile = "path/to/certfile"