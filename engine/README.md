# FluxGuard Backend Server

Production-ready backend for FluxGuard - an AI agent API proxy with auto-repair capabilities.

## Features

- **Request Validation**: Validates AI agent requests against OpenAPI specifications
- **Auto-Repair Engine**: Automatically fixes schema drift using:
  - Fuzzy field matching (handles naming conventions: camelCase, snake_case, kebab-case)
  - Type coercion (string ↔ number ↔ boolean conversions)
  - Smart default injection (currency, status, quantity defaults)
- **Request Forwarding**: Forwards sanitized requests to target APIs
- **Comprehensive Logging**: Tracks all requests with detailed drift information
- **Dashboard Analytics**: Provides stats on stable, repaired, and blocked requests

## Tech Stack

- **Express.js**: Web framework
- **TypeScript**: Type-safe development
- **PostgreSQL**: Database
- **Drizzle ORM**: Type-safe database queries
- **AJV**: JSON schema validation
- **Bcrypt**: Password hashing
- **JWT**: Authentication tokens

## Architecture

```
server/
├── src/
│   ├── config/          # Configuration and environment variables
│   ├── db/              # Database schema and migrations
│   ├── types/           # TypeScript type definitions
│   ├── repositories/    # Data access layer
│   ├── services/        # Business logic layer
│   ├── controllers/     # HTTP request handlers
│   ├── routes/          # Express routes
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions (validation, repair, fuzzy matching)
│   ├── app.ts           # Express app setup
│   └── index.ts         # Server entry point
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Setup PostgreSQL Database

Make sure PostgreSQL is installed and running. Create a database:

```bash
createdb fluxguard
```

### 3. Configure Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Update `.env` with your values:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/fluxguard"
JWT_SECRET="your-secret-key-here"
PORT=3000
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
```

### 4. Generate and Run Migrations

Generate migration files from the schema:

```bash
npm run db:generate
```

Apply migrations to the database:

```bash
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Database Schema

### Tables

1. **users**
   - id (UUID, PK)
   - email (unique)
   - passwordHash
   - createdAt

2. **projects**
   - id (UUID, PK)
   - userId (FK → users.id)
   - name
   - targetBaseUrl
   - fluxApiKey (unique)
   - createdAt

3. **api_schemas**
   - id (UUID, PK)
   - projectId (FK → projects.id)
   - version
   - schemaSpec (JSONB)
   - isActive (boolean)
   - createdAt

4. **request_logs**
   - id (UUID, PK)
   - projectId (FK → projects.id)
   - timestamp
   - agentId
   - httpMethod
   - endpointPath
   - latencyTotalMs
   - overheadMs
   - status (stable | repaired | blocked)
   - originalBody (JSONB)
   - sanitizedBody (JSONB)
   - driftDetails (JSONB)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Projects

- `POST /api/projects` - Create project
- `GET /api/projects` - Get all user projects
- `GET /api/projects/:id` - Get project by ID
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/schema` - Upload OpenAPI schema
- `GET /api/projects/:id/schemas` - Get all schemas for project
- `PUT /api/projects/:id/schemas/:schemaId/activate` - Set active schema
- `POST /api/projects/:id/regenerate-key` - Regenerate API key
- `GET /api/projects/:id/stats` - Get dashboard stats
- `GET /api/projects/:id/logs` - Get request logs (with pagination)

### Proxy

- `ALL /proxy/*` - Main proxy endpoint (handles all HTTP methods)

**Headers Required:**
- `X-Flux-Key`: Your FluxGuard API key
- `X-Flux-Agent-Id`: (Optional) Agent identifier

**Response Headers:**
- `X-Flux-Status`: Request status (stable | repaired | blocked)
- `X-Flux-Overhead`: Processing overhead in ms
- `X-Flux-Total-Latency`: Total request latency in ms
- `X-Flux-Repaired`: "true" if request was auto-repaired

## How It Works

### Request Flow

1. **Receive**: AI agent sends request to `/proxy/*` endpoint
2. **Authenticate**: Verify `X-Flux-Key` header
3. **Validate**: Check request against OpenAPI schema
4. **Auto-Repair** (if validation fails):
   - Fuzzy match field names (usr_id → userId)
   - Coerce types ("100" → 100)
   - Inject smart defaults (missing currency → "USD")
5. **Forward**: Send sanitized request to target API
6. **Log**: Record request with drift details
7. **Respond**: Return target API response with FluxGuard metadata

### Auto-Repair Features

**1. Fuzzy Field Matching**
- Handles naming convention mismatches (camelCase ↔ snake_case ↔ kebab-case)
- Expands abbreviations (usr → user, amt → amount, curr → currency)
- Uses Levenshtein distance for typo corrections

**2. Type Coercion**
- String to number: `"100"` → `100`
- Number to string: `42` → `"42"`
- String to boolean: `"true"` → `true`
- Handles edge cases: removes currency symbols, comma separators

**3. Smart Default Injection**
- Field-specific defaults:
  - `currency` → `"USD"`
  - `country` → `"US"`
  - `language` → `"en"`
  - `quantity` → `1`
  - `status` → `"active"`
- Type-based fallbacks:
  - `string` → `""`
  - `number` → `0`
  - `boolean` → `false`
  - `array` → `[]`
  - `object` → `{}`

## Useful Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build            # Compile TypeScript to JavaScript

# Database
npm run db:generate      # Generate migrations from schema
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes directly (dev only)
npm run db:studio        # Open Drizzle Studio (database GUI)
```

## Testing the Proxy

Example request to the proxy:

```bash
curl -X POST http://localhost:3000/proxy/api/payments \
  -H "X-Flux-Key: flux_YOUR_API_KEY" \
  -H "X-Flux-Agent-Id: agent-123" \
  -H "Content-Type: application/json" \
  -d '{
    "usr_id": "user-456",
    "amt": "100.00",
    "curr": "USD"
  }'
```

If your OpenAPI schema expects `userId`, `amount`, and `currency`, FluxGuard will automatically repair these fields and forward the correct request.

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use a proper PostgreSQL instance (not local)
3. Set a strong `JWT_SECRET`
4. Configure CORS for your frontend domain
5. Use a process manager like PM2
6. Set up database backups
7. Configure logging and monitoring

## License

MIT
