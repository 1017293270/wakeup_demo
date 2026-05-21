# Docker Deployment

This project can run as two containers:

- `frontend`: Nginx serves the built Vue app and proxies `/api/v1/*` and `/ws`.
- `voice-service`: FastAPI HTTP API and WebSocket voice pipeline on port `8766`.

## 1. Prepare Environment Variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Required for `voice-service`:

```env
VOICE_MYSQL_HOST=host.docker.internal
VOICE_MYSQL_PORT=3306
VOICE_MYSQL_USER=wakeup_user
VOICE_MYSQL_PASSWORD=change_me
VOICE_MYSQL_DATABASE=wakeup_demo

VOICE_BAIDU_APP_ID=change_me
VOICE_BAIDU_API_KEY=change_me
VOICE_BAIDU_SECRET_KEY=change_me
```

If MySQL is on another server, set `VOICE_MYSQL_HOST` to that server IP or domain.

If MySQL is on the same Linux host as Docker, `host.docker.internal` works through the Compose `extra_hosts` entry.

Optional dialog service variables:

```env
VOICE_WORKFLOW_BASE_URL=http://127.0.0.1:7000/sz
VOICE_WORKFLOW_USERNAME=
VOICE_WORKFLOW_PASSWORD=
```

## 2. Prepare MySQL

Create the database before starting the service:

```sql
CREATE DATABASE IF NOT EXISTS `wakeup_demo`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

The service creates its tables and default config on startup.

## 3. Start Containers

```bash
docker compose up -d --build
```

Check logs:

```bash
docker logs -f wakeup-voice-service
docker logs -f wakeup-frontend
```

Open:

```text
http://server-ip:8080
```

## 4. HTTPS and WebSocket

Browser microphone access requires HTTPS except on localhost.

In production, put Nginx, Caddy, a cloud load balancer, or another HTTPS reverse proxy in front of `frontend`.

Proxy the public HTTPS site to:

```text
http://127.0.0.1:8080
```

The frontend uses the same origin by default:

- HTTP API: `/api/v1/*`
- WebSocket: `/ws`

So with HTTPS, the browser will connect to:

```text
wss://your-domain/ws
```

Set `VITE_VOICE_WS_URL` only if the WebSocket is on a different domain.

After changing `VITE_VOICE_WS_URL`, rebuild the frontend:

```bash
docker compose up -d --build frontend
```

## 5. Common Commands

Restart:

```bash
docker compose restart
```

Stop:

```bash
docker compose down
```

Rebuild after code changes:

```bash
docker compose up -d --build
```
