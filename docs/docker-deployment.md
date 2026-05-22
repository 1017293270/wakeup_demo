# Docker Deployment

This project runs as two application containers and uses the existing MySQL on the server:

- `voice-service`: FastAPI HTTP API and WebSocket voice pipeline on port `8766`.
- `frontend`: Nginx serves the built Vue app and proxies `/api/v1/*` and `/ws`.
- MySQL: an existing host database, not managed by this Compose file.

## 1. Prepare MySQL

Create the database in the existing MySQL service:

```sql
CREATE DATABASE IF NOT EXISTS `wakeup_demo`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Create or grant an application user:

```sql
CREATE USER IF NOT EXISTS 'wakeup_user'@'%' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON `wakeup_demo`.* TO 'wakeup_user'@'%';
FLUSH PRIVILEGES;
```

If you use an existing MySQL user, make sure it can connect from the Docker bridge network.

## 2. Prepare Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and fill in real values:

```env
FRONTEND_PORT=9080
VOICE_SERVICE_PORT=8766

VOICE_MYSQL_HOST=host.docker.internal
VOICE_MYSQL_PORT=3306
VOICE_MYSQL_USER=wakeup_user
VOICE_MYSQL_PASSWORD=change_me
VOICE_MYSQL_DATABASE=wakeup_demo

VOICE_BAIDU_APP_ID=change_me
VOICE_BAIDU_API_KEY=change_me
VOICE_BAIDU_SECRET_KEY=change_me

VOICE_WORKFLOW_BASE_URL=http://your-workflow-service/sz
VOICE_WORKFLOW_USERNAME=
VOICE_WORKFLOW_PASSWORD=
```

Use `VOICE_MYSQL_HOST=host.docker.internal` when MySQL runs on the same server as Docker.

Do not commit `.env` to Git.

## 3. Start Containers

```bash
docker compose up -d --build
```

The voice service creates its own tables and default config after it connects to MySQL.

Check logs:

```bash
docker logs -f wakeup-voice-service
docker logs -f wakeup-frontend
```

Open:

```text
http://server-ip:9080
```

## 4. HTTPS and WebSocket

Browser microphone access requires HTTPS except on localhost.

In production, put Nginx, Caddy, a cloud load balancer, or another HTTPS reverse proxy in front of `frontend`.

Proxy the public HTTPS site to:

```text
http://127.0.0.1:9080
```

The frontend uses the same origin by default:

- HTTP API: `/api/v1/*`
- WebSocket: `/ws`

So with HTTPS, the browser will connect to:

```text
wss://your-domain/ws
```

Leave `VITE_VOICE_WS_URL` empty unless the WebSocket is on a different domain.

After changing `VITE_VOICE_WS_URL`, rebuild the frontend:

```bash
docker compose up -d --build frontend
```

## 5. Common Commands

Restart:

```bash
docker compose restart
```

Rebuild after code changes:

```bash
docker compose up -d --build
```
