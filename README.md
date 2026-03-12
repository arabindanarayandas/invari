# invari

**The repair layer for AI agents. Intercepts and fixes malformed API calls in under 30ms — before they crash your production systems.**

AI agents break in production. Not because they're stupid — because they send `"Five"` instead of `5`, `"tomorrow at 4pm"` instead of `2026-03-14`, `party_size` instead of `guest_count`. Every one of these triggers a 400 error, a retry, a 3-second silence, and a user who hangs up.

invari sits between your agent and your API. It validates every outgoing request against your OpenAPI spec, auto-repairs the mistakes it finds, and lets the call through — all in under 30ms. No retries. No broken conversations. No crashed automations.

---

## How it works

```
AI Agent  ──[malformed]──▶  invari  ──[repaired]──▶  Your API
                              │
                    validates + repairs
                       in <30ms
```

**Without invari:** agent sends `"party_size": "Five"` → 400 error → retry logic fires → 3-second silence → user hangs up.

**With invari:** agent sends `"party_size": "Five"` → invari intercepts → repairs to `"guest_count": 5` → API call succeeds → conversation continues.

---

## Performance

Tested in internal infrastructure soak test:

| Metric | Result |
|--------|--------|
| Requests processed | 121,400 |
| Requests requiring repair | 40% |
| Requests blocked (security) | 27% |
| Overhead per request | <30ms |

---

## What invari repairs

- **Type errors** — `"Five"` → `5`, `"true"` → `true`
- **Field name mismatches** — `party_size` → `guest_count`, `date` → `appointment_date`
- **Format violations** — `"tomorrow at 4pm"` → `"2026-03-14T16:00:00Z"`
- **Missing required fields** — infers and injects from context where possible
- **Security threats** — identifies and blocks malicious or anomalous requests

---

## Quick start

### Prerequisites

- Node.js v24+
- pnpm v8+
- PostgreSQL v14+

### Setup

**1. Clone and install:**

```bash
git clone https://github.com/arabindanarayandas/invari.git
cd invari
make install
```

**2. Set up your database:**

```bash
createdb invari
cp engine/.env.example engine/.env
# Edit engine/.env with your database credentials
make db-migrate
```

**3. Start the development servers:**

```bash
make dev-all
```

**4. Access:**
- Dashboard: `http://localhost:5173`
- API server: `http://localhost:3000`

---

## First integration

Once invari is running:

1. **Create an agent** in the dashboard
2. **Upload your OpenAPI spec** (Swagger/OpenAPI 3.x)
3. **Copy your invari API key**
4. **Route your agent's outgoing requests through invari** instead of directly to your API

Your agent points to invari. invari validates, repairs, and forwards to your API. You watch it work in the real-time dashboard.

---

## Configuration

### Engine (`engine/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret key for auth tokens |
| `PORT` | No | `3000` | API server port |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed origins |
| `NODE_ENV` | No | `development` | Environment |

Generate a secure JWT secret:

```bash
openssl rand -base64 64
```

### Web console (`web-console/.env`)

```
VITE_API_BASE_URL=http://localhost:3000
```

---

## Available commands

```bash
make help         # Show all commands
make dev-all      # Start engine + web console
make dev          # Start web console only
make dev-engine   # Start engine only
make build        # Build for production
make test         # Run tests
```

---

## Troubleshooting

**Installation fails**

Make sure you have Node.js v24+ installed. invari uses native Node.js features unavailable in earlier versions. Check your version:
```bash
node --version
```

If you need to manage multiple Node versions, [nvm](https://github.com/nvm-sh/nvm) is the easiest path:
```bash
nvm install 24
nvm use 24
```

Also make sure pnpm v8+ is installed:
```bash
npm install -g pnpm
```

**Database connection failed**

Check that PostgreSQL is running and `DATABASE_URL` in `engine/.env` matches your credentials:
```bash
pg_isready
psql -U postgres -l | grep invari
```

**Port already in use**

Change the port in `engine/.env`:
```
PORT=3001
```

---

## License

[PolyForm Noncommercial License 1.0.0](LICENSE) — free for non-commercial use.

---

## Links

- Website: [invari.ai](https://invari.ai)
- Feedback: [Leave feedback](https://forms.gle/ji3LcBXE6SVeVenq7)

