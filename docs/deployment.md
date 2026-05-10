# Production Deployment Guide

## Architecture

```
                      ┌──────────────────────────────────┐
                      │         Apache (port 443)         │
                      │   https://nadil.cloud             │
                      │   mod_proxy + mod_proxy_wstunnel  │
                      └──────┬─────────────┬─────────────┘
                             │             │
              ┌──────────────┘             └──────────────┐
              ▼                                            ▼
   ┌─────────────────────┐                  ┌─────────────────────┐
   │  Frontend Container  │                  │  Backend Container   │
   │  Next.js (port 3000)  │                  │  Express (port 3001) │
   │  https://nadil.cloud  │                  │  API + Socket.io      │
   └─────────────────────┘                  └─────────────────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────────┐
                                            │   SQLite Volume      │
                                            │   /app/data/dev.db   │
                                            └─────────────────────┘
```

- **Same domain**: Frontend and API are served under `nadil.cloud`
- **Apache** routes `/api/*` and `/api/socket.io/*` to the backend container
- **Apache** routes everything else to the frontend container
- **WebSocket** (Socket.io) requires `mod_proxy_wstunnel` for upgrade support

---

## Prerequisites

- Docker & Docker Compose on the VPS
- Apache 2.4+ with `mod_proxy`, `mod_proxy_http`, `mod_proxy_wstunnel`, `mod_ssl`, `mod_rewrite` enabled
- SSL certificate (Let's Encrypt via Certbot or similar)
- Domain(s) pointed to the VPS IP

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | — | Must be `production` |
| `PORT` | No | `3001` | Backend listen port |
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Allowed CORS origin (e.g., `https://nadil.cloud`) |
| `CORS_ORIGIN` | Yes | `http://localhost:3000` | Socket.io CORS origin (e.g., `https://nadil.cloud`) — **separate from `FRONTEND_URL`** |
| `DATABASE_URL` | No | `file:/app/data/dev.db` | SQLite path inside container |
| `JWT_SECRET` | **Yes** | — | HMAC key for JWT signing. Generate: `openssl rand -hex 32` |
| `ACCESS_TOKEN_TTL` | No | `15m` | Access token lifetime (`s`/`m`/`h`/`d`) |
| `REFRESH_TOKEN_TTL` | No | `7d` | Refresh token lifetime (`s`/`m`/`h`/`d`) |
| `BCRYPT_ROUNDS` | No | `12` | Password hash cost factor |
| `MAX_LOGIN_ATTEMPTS` | No | `5` | Lockout threshold |
| `LOCKOUT_DURATION_MINUTES` | No | `30` | Lockout duration |
| `LLM_PROVIDER` | No | `opencode` | Default LLM provider |
| `LLM_MODEL` | No | `deepseek-v4-flash` | Default LLM model |
| `OPENCODE_API_KEY` | **Yes** | — | OpenCode API key for cloud LLM access |
| `OPENAI_API_KEY` | No | — | If using OpenAI provider |
| `GEMINI_API_KEY` | No | — | If using Gemini provider |
| `GROQ_API_KEY` | No | — | If using Groq provider |
| `DUALHOOK_API_KEY` | **Yes** | — | DualHook platform API key |
| `DUALHOOK_SIGNING_SECRET` | **Yes** | — | DualHook webhook signing secret |
| `DUALHOOK_REDIRECT_BASE` | Yes | `http://localhost:3000` | DualHook OAuth redirect (e.g., `https://nadil.cloud`) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:3001/api` | Backend API base URL. In production: `https://nadil.cloud/api` (same domain via Apache proxy) |

**Important:** `NEXT_PUBLIC_API_URL` is baked into the Next.js build. It must be set at **build time** (via build arg in Docker), not at runtime.

---

## Apache Reverse Proxy Configuration

Save as `/etc/apache2/sites-available/nadil.cloud.conf` (or equivalent path for your Apache setup):

```apache
<VirtualHost *:80>
    ServerName nadil.cloud
    ServerAlias api.nadil.cloud
    Redirect permanent / https://nadil.cloud/
</VirtualHost>

<VirtualHost *:443>
    ServerName nadil.cloud

    SSLEngine on
    SSLCertificateFile      /etc/letsencrypt/live/nadil.cloud/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/nadil.cloud/privkey.pem

    # ─── Frontend (Next.js) ─────────────────────────────────────
    # Everything except /api/* goes to the frontend container
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # ─── API (Express) ──────────────────────────────────────────
    # /api/* routes go to the backend container
    ProxyPass /api/ http://127.0.0.1:3001/api/
    ProxyPassReverse /api/ http://127.0.0.1:3001/api/

    # ─── WebSocket (Socket.io) ──────────────────────────────────
    # Must come BEFORE the general /api/ rule
    <Location /api/socket.io>
        Require all granted
        RewriteEngine On
        RewriteCond %{HTTP:Upgrade} =websocket [NC]
        RewriteRule /api/socket.io/(.*) ws://127.0.0.1:3001/api/socket.io/$1 [P,L]
        ProxyPass http://127.0.0.1:3001/api/socket.io/
        ProxyPassReverse http://127.0.0.1:3001/api/socket.io/
    </Location>

    # ─── Static uploads ─────────────────────────────────────────
    ProxyPass /uploads/ http://127.0.0.1:3001/uploads/
    ProxyPassReverse /uploads/ http://127.0.0.1:3001/uploads/

    # ─── Headers ────────────────────────────────────────────────
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
</VirtualHost>
```

**WebSocket note:** The `RewriteCond %{HTTP:Upgrade} =websocket` rule is critical — without it, the Socket.io WebSocket upgrade will fail silently. Apache requires `mod_proxy_wstunnel` for this.

**Let's Encrypt / Certbot note:** If you ran `certbot --apache`, it auto-creates `nadil.cloud-le-ssl.conf`. The WebSocket rewrite rules must go in the **SSL vhost** (the `*:443` block) — not just the plain HTTP vhost. Also, more-specific proxy rules (Socket.io rewrite) must come **before** less-specific ones (`ProxyPass /api`).

**Alternative — minimal Let's Encrypt fix:** If your existing SSL config already has `ProxyPass /api http://127.0.0.1:3001/api`, add these 3 lines right before it:

```apache
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /api/socket.io/(.*) ws://127.0.0.1:3001/api/socket.io/$1 [P,L]
```

### Enable the site

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite ssl headers
sudo a2ensite nadil.cloud.conf
sudo systemctl restart apache2
```

---

## Docker Compose Production Setup

The included `docker-compose.yml` is ready for production. Key points:

```yaml
frontend:
  build:
    args:
      NEXT_PUBLIC_API_URL: https://nadil.cloud/api    # Build-time only

backend:
  environment:
    - NODE_ENV=production
    - FRONTEND_URL=https://nadil.cloud
    - CORS_ORIGIN=https://nadil.cloud                  # Socket.io needs this separately
    - JWT_SECRET=${JWT_SECRET}                         # From host .env
    - OPENCODE_API_KEY=${OPENCODE_API_KEY}
    - DUALHOOK_API_KEY=${DUALHOOK_API_KEY}
    - DUALHOOK_SIGNING_SECRET=${DUALHOOK_SIGNING_SECRET}
```

**Do not change** the `NEXT_PUBLIC_API_URL` to a different domain unless you configure CORS accordingly. Using `https://nadil.cloud/api` (same domain as the frontend) avoids cross-origin issues with cookies.

---

## Deployment Steps

### Step 1: Prepare the VPS

```bash
ssh root@your-vps
apt update && apt upgrade -y
apt install -y docker.io docker-compose apache2 certbot python3-certbot-apache
```

### Step 2: Clone and configure

```bash
git clone <repo-url> /opt/nadil
cd /opt/nadil
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set all required values:

```bash
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
OPENCODE_API_KEY=sk-...
DUALHOOK_API_KEY=dh_live_...
DUALHOOK_SIGNING_SECRET=whsec_...
FRONTEND_URL=https://nadil.cloud
CORS_ORIGIN=https://nadil.cloud
```

### Step 3: Set up database and seed

The `deploy.sh` script handles this, or manually:

```bash
docker compose up -d
docker compose exec backend npx prisma db push
docker compose exec backend npx prisma db seed
```

The seed creates:
- **Business** with API key: `api-key-1` (auto-generated UUID format, check seed output)
- **Admin user**: `admin@al-baraka.com` / `Admin123!`
- **Platform admin**: `admin@platform.com` / `PlatformAdmin123!`

**Important:** The first `docker compose up -d` may fail if the SQLite directory isn't writable — verify `docker compose logs backend` shows no permission errors.

### Step 4: Configure SSL

```bash
certbot --apache -d nadil.cloud -d api.nadil.cloud
```

### Step 5: Verify

See [Post-Deploy Verification](#post-deploy-verification) below.

---

## Post-Deploy Verification

### 1. Health check (no auth required)

```bash
curl -s https://nadil.cloud/api/health
# Expected: {"status":"ok"}
```

### 2. Frontend serves HTML

```bash
curl -s -o /dev/null -w "%{http_code}" https://nadil.cloud/
# Expected: 200
```

### 3. API key auth works

```bash
curl -s https://nadil.cloud/api/business \
  -H "x-api-key: <api-key-from-seed>"
# Expected: 200 with business JSON
```

### 4. JWT auth works (login)

```bash
curl -s -X POST https://nadil.cloud/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-api-key: <api-key>" \
  -d '{"email":"admin@al-baraka.com","password":"Admin123!"}'
# Expected: 200 with accessToken + user
```

### 5. WebSocket works

Open the browser console on `https://nadil.cloud` and check for:
- No `WebSocket connection failed` errors
- Socket.io client connected message in backend logs: `docker compose logs backend | grep "Client connected"`

### 6. Full dashboard flow

Open `https://nadil.cloud` in a browser:
1. Login with admin@al-baraka.com / Admin123! (and API key)
2. Navigate to Settings page
3. Verify no 401 errors in the console

---

## Troubleshooting

### 401 Unauthorized on `/api/settings`, `/api/business`, `/api/zones`

**Most common causes:**

| Cause | Diagnosis | Fix |
|-------|-----------|-----|
| **Stale localStorage** | User was logged in before deploy, but DB was reseeded. Old API key / JWT in localStorage doesn't match new DB. | Clear localStorage (`Application > Storage > Clear site data`) and re-login |
| **JWT expired** | Access token TTL is `15m` by default. After expiry, the 401 interceptor tries to refresh via cookie. | Check that cookies are sent on `/api/auth/refresh` (DevTools > Network). If no `refreshToken` cookie, user must re-login |
| **Cookie not sent cross-origin** | Backend sets `sameSite: 'lax'` + `secure: true`. This can fail if domains differ. | Keep frontend and API on the **same domain** via Apache path proxy (recommended). Or change to `sameSite: 'none'` in `backend/src/lib/auth.ts` |
| **Refresh token expired** | Default TTL is `7d`. After 7 days of inactivity, user must re-login. | Normal behavior. Re-login generates new tokens |
| **Apache routing wrong** | `/api/` requests hitting frontend container instead of backend. | Verify Apache config. Test: `curl -s https://nadil.cloud/api/health` should return `{"status":"ok"}` from backend, not a Next.js 404 |

### WebSocket connection failed

| Cause | Diagnosis | Fix |
|-------|-----------|-----|
| **`mod_proxy_wstunnel` not enabled** | Browser console shows WebSocket connection failed | `sudo a2enmod proxy_wstunnel && sudo systemctl restart apache2` |
| **Apache WebSocket rewrite rule missing** | Socket.io falls back to long-polling (works slowly) | Add the `RewriteCond %{HTTP:Upgrade} =websocket` rule (see Apache config above) |
| **`CORS_ORIGIN` env var not set** | Backend Socket.io CORS defaults to `http://localhost:3000` | Set `CORS_ORIGIN=https://nadil.cloud` in backend `docker-compose.yml` environment |
| **Backend not reachable** | Apache can't proxy to backend:3001 | `docker compose ps` — backend must be `Up` |
| **`SOCKET_URL` wrong** | Frontend derives socket URL from `NEXT_PUBLIC_API_URL` by stripping `/api` suffix | If `NEXT_PUBLIC_API_URL` is `https://nadil.cloud/api`, socket URL becomes `https://nadil.cloud` — should work via Apache proxy to same domain |

### Apache 502 Bad Gateway

```bash
# Check if containers are running
docker compose ps

# Check Apache error log
sudo tail -f /var/log/apache2/error.log
```

Common fix: restart containers and Apache:

```bash
docker compose restart
sudo systemctl restart apache2
```

### Database permission errors

The SQLite database is mounted as a Docker volume at `/app/data`. If the backend user (UID 1001) can't write to it:

```bash
docker compose exec backend ls -la /app/data
# Fix ownership if needed
docker compose exec backend chown -R 1001:1001 /app/data
```

---

## Cookie & Auth Architecture Summary

```
Login ──► POST /api/auth/login
            ├─ x-api-key: <biz-key>
            ├─ email + password
            └─ Response: accessToken (body) + refreshToken (httpOnly cookie)

API Call ──► GET /api/settings
               ├─ Authorization: Bearer <accessToken>
               ├─ x-api-key: <biz-key>
               └─ Backend checks Bearer first, falls back to x-api-key

401 ──► Axios interceptor
          └─ POST /api/auth/refresh
               └─ Sends refreshToken cookie (withCredentials: true)
                    └─ If success: retry original request
                    └─ If fail: clearAuth() → redirect to /login
```

- Both `Authorization: Bearer` and `x-api-key` headers are sent simultaneously
- Backend prefers the Bearer token if present
- The `x-api-key` header is used for: login/register initial auth, and as fallback for API calls
- Access tokens expire after `ACCESS_TOKEN_TTL` (default `15m`)
- Refresh tokens expire after `REFRESH_TOKEN_TTL` (default `7d`)
- Refresh cookies are `httpOnly`, `secure` (prod), `sameSite: 'lax'`, path: `/`

---

## Required .gitignore Configuration

Ensure `.gitignore` includes `.env` files to prevent secret leaks:

```
.env
.env.*
!.env.example
```

This is already configured in the project's `.gitignore`.
