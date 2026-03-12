<h1 align="center">Invari</h1>

<p align="center">
  <strong>Production-ready API validation platform for AI agents</strong>
</p>

<p align="center">
  <a href="https://github.com/arabindanarayandas/invari/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-PolyForm%20Noncommercial-blue.svg" alt="License"></a>
  <a href="https://github.com/arabindanarayandas/invari/stargazers"><img src="https://img.shields.io/github/stars/arabindanarayandas/invari?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/arabindanarayandas/invari/issues"><img src="https://img.shields.io/github/issues/arabindanarayandas/invari" alt="GitHub issues"></a>
</p>

<p align="center">
  Validates requests against OpenAPI specifications, auto-repairs common mistakes, and detects security threats—ensuring your AI agents generate safe, spec-compliant API calls before they reach your production systems.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **🔍 OpenAPI Validation** - Validates all requests against your OpenAPI/Swagger specifications
- **🔧 Auto-Repair Engine** - Automatically fixes common mistakes like field naming mismatches and type errors
- **🛡️ Security Detection** - Identifies and blocks malicious or anomalous requests
- **📊 Real-time Monitoring** - Live dashboard with analytics and request logs
- **🔄 Schema Versioning** - Track and compare API schema changes over time
- **⚡ Low Latency** - Minimal overhead with intelligent caching

## Quick Start

**Prerequisites**
- [Node.js](https://nodejs.org/) v24 or higher
- [pnpm](https://pnpm.io/) v8 or higher
- [PostgreSQL](https://www.postgresql.org/) v14 or higher

**Setup**

1. **Clone and install dependencies:**
```bash
git clone https://github.com/arabindanarayandas/invari.git
cd invari
make install
```

2. **Setup database:**
```bash
# Create PostgreSQL database
createdb invari

# Configure environment
cp engine/.env.example engine/.env
# Edit engine/.env with your database credentials

# Run migrations
make db-migrate
```

3. **Start development servers:**
```bash
make dev-all
```

4. **Access the application:**
   - Web Console: http://localhost:5173
   - API Server: http://localhost:3000

**Available commands:**
```bash
make help              # Show all available commands
make dev-all          # Start both engine and web-console
make dev              # Start web-console only
make dev-engine       # Start engine only
make build            # Build for production
make test             # Run tests
```

## Configuration

### Environment Variables

**Engine (`engine/.env`):**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invari
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**Web Console (`web-console/.env`):**
```env
VITE_API_BASE_URL=http://localhost:3000
```

See [.env.example](.env.example) for all available configuration options.

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0 - see the [LICENSE](LICENSE) file for details.

**In brief:** This software is free to use for noncommercial purposes. Commercial use requires a separate license.

---
