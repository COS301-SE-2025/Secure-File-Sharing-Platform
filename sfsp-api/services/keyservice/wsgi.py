import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app import app

if __name__ == "__main__":
    app.run()