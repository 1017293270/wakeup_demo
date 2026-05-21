# Docker Deployment

This project runs as three containers:

- `mysql`: MySQL 8.4 with persistent data in the `mysql-data` Docker volume.
- `voice-service`: FastAPI HTTP API and WebSocket voice pipeline on port `8766`.
- `frontend`: Nginx serves the built Vue app and proxies `/api/v1/*` and `/ws`.

## 1. Prepare Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and fill in real values:

```env
FRONTEND_PORT=8080
VOICE_SERVICE_PORT=8766
MYSQL_PORT=3306

MYSQL_ROOT_PASSWORD=change_root_password
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

Do not commit `.env` to Git.

## 2. Start Containers

```bash
docker compose up -d --build
```

The MySQL container creates the database and user from `.env` on first startup.

The voice service creates its own tables and default config after it connects to MySQL.

Check logs:

```bash
docker logs -f wakeup-mysql
docker logs -f wakeup-voice-service
docker logs -f wakeup-frontend
```

Open:

```text
http://server-ip:8080
```

## 3. HTTPS and WebSocket

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

Leave `VITE_VOICE_WS_URL` empty unless the WebSocket is on a different domain.

After changing `VITE_VOICE_WS_URL`, rebuild the frontend:

```bash
docker compose up -d --build frontend
```

## 4. Database Notes

MySQL data persists in the Docker volume named `wakeup_demo_mysql-data`.

Stop containers without deleting data:

```bash
docker compose down
```

Delete containers and MySQL data:

```bash
docker compose down -v
```

Connect to MySQL from the host:

```bash
mysql -h 127.0.0.1 -P 3306 -u wakeup_user -p wakeup_demo
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
