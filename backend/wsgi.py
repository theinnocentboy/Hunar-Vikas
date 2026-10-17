from pathlib import Path
import sys

from dotenv import load_dotenv

# Support both `flask --app wsgi` from backend/ and
# `flask --app backend.wsgi` from the repository root.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import create_app
from backend.auth_service import AuthService

# Load local secrets for development. Deployment environment variables take
# precedence because load_dotenv does not override existing values.
load_dotenv(Path(__file__).with_name(".env"))

auth = AuthService.from_env()
auth.init_db()
app = create_app(
    {"DEV_MODE": False, "ALLOWED_ORIGINS": auth.cfg.allowed_origins},
    identity_resolver=auth.resolve_identity,
)
auth.init_app(app)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)