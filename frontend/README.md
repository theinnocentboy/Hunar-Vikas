# Hunar Vikas

Hunar Vikas is a skills and livelihoods platform with a React frontend and a
Flask authentication service.

## Repository layout

- `backend/` - Flask WSGI app, authentication service, SQLAlchemy schema, tests
- `LandinPage/` - landing page
- `login/` - sign-in and password recovery
- `Registration/` - registration and email verification
- `dashboard/` - authenticated dashboard
- `shared/` - shared React components and authentication client
- `render.yaml` - Render deployment services

## Local development

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m auth_service.cli init-db
python -m flask --app wsgi run --host 127.0.0.1 --port 5000
```

Copy `backend/.env.example` to `backend/.env` for local settings. Local
verification emails are written to `backend/instance/outbox/`.

### Frontend

Install dependencies in each frontend app, then start the app you need:

```powershell
cd Registration
npm ci
npm run dev
```

The login, registration, and dashboard Vite configurations proxy `/api` to
`http://127.0.0.1:5000` during local development.

## Tests and builds

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest

cd ..\Registration
npm ci
npm run build
```

The same build commands apply to `LandinPage`, `login`, and `dashboard`.

## Production configuration

Production secrets must be configured in the deployment provider, never in
Git. Required backend values include:

- `AUTH_SECRET_KEY`
- `AUTH_DATABASE_URL` using Supabase PostgreSQL and `psycopg`
- `AUTH_APP_BASE_URL`
- `AUTH_ALLOWED_ORIGINS`
- `AUTH_MAIL_FROM`
- `AUTH_RESEND_API_KEY`

Use HTTPS, `AUTH_COOKIE_SECURE=true`, a verified Resend sender domain, and a
persistent Supabase PostgreSQL database. See
[backend/README.md](./backend/README.md) and
[backend/.env.example](./backend/.env.example).

Do not commit `.env`, SQLite databases, email outbox files, virtual
environments, `node_modules`, or build output. The repository `.gitignore`
excludes these files.
