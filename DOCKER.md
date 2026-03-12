# Invari - Docker Deployment Guide

Production-ready Docker setup for Invari with PostgreSQL database.

## Quick Start

### Using docker-compose (Recommended)

```bash
# 1. Clone or extract the repository
cd invari

# 2. Create environment file
cp .env.example .env

# 3. Edit .env and update values (especially JWT_SECRET!)
nano .env

# 4. Start everything
docker-compose up

# 5. Access the application
# Open http://localhost:3000 in your browser
```

That's it! The application will:
- ✅ Start PostgreSQL database
- ✅ Run database migrations automatically
- ✅ Create a default admin user (for empty databases)
- ✅ Start the Invari engine
- ✅ Serve the web console

### First Login

For a fresh installation, a default admin user is automatically created:

```
Email:    admin@invari.ai
Password: invari123
```

**⚠️  Change these credentials immediately after first login!**

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
POSTGRES_DB=invari
POSTGRES_USER=invari
POSTGRES_PASSWORD=invari123

# Application
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=http://localhost:3000

# Default Admin User (for empty databases)
CREATE_DEFAULT_USER=true
DEFAULT_ADMIN_EMAIL=admin@invari.ai
DEFAULT_ADMIN_PASSWORD=invari123

# Optional
ENABLE_CRON=false
SEED_DATABASE=false
```

**Important:** Change the `JWT_SECRET` to a long random string in production!

Generate a secure secret:
```bash
openssl rand -base64 64
```

### Default Admin User

When starting with an empty database, Invari automatically creates a default admin user so you can log in immediately.

**Default Credentials:**
- Email: `admin@invari.ai`
- Password: `invari123`

**Customize Default User:**
```env
DEFAULT_ADMIN_EMAIL=admin@mycompany.com
DEFAULT_ADMIN_PASSWORD=my-secure-password
```

**Disable Default User Creation:**
```env
CREATE_DEFAULT_USER=false
```

**Notes:**
- Default user is only created if the database is completely empty
- This check runs on every startup but is idempotent (safe to run multiple times)
- After first login, immediately create your own admin account and delete the default user

---

## Docker Commands

### Start Application

```bash
# Start in foreground (see logs)
docker-compose up

# Start in background (detached)
docker-compose up -d

# View logs
docker-compose logs -f app
```

### Stop Application

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (⚠️  deletes database!)
docker-compose down -v
```

### Rebuild After Code Changes

```bash
# Rebuild the image
docker-compose build

# Or rebuild and start
docker-compose up --build
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec db psql -U invari -d invari

# Backup database
docker-compose exec db pg_dump -U invari invari > backup.sql

# Restore database
docker-compose exec -T db psql -U invari -d invari < backup.sql
```

---

## Using the Standalone Docker Image

If you want to run without docker-compose:

### Build the Image

```bash
docker build -t invari:latest .
```

### Run with External PostgreSQL

```bash
docker run -d \
  --name invari-app \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/invari \
  -e JWT_SECRET=your-secret-key \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e DEFAULT_ADMIN_EMAIL=admin@mycompany.com \
  -e DEFAULT_ADMIN_PASSWORD=secure-password-123 \
  invari:latest
```

### Run with Docker Network

```bash
# Create network
docker network create invari-network

# Run PostgreSQL
docker run -d \
  --name invari-db \
  --network invari-network \
  -e POSTGRES_DB=invari \
  -e POSTGRES_USER=invari \
  -e POSTGRES_PASSWORD=invari123 \
  postgres:15-alpine

# Run Invari
docker run -d \
  --name invari-app \
  --network invari-network \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://invari:invari123@invari-db:5432/invari \
  -e JWT_SECRET=your-secret-key \
  -e DEFAULT_ADMIN_EMAIL=admin@mycompany.com \
  -e DEFAULT_ADMIN_PASSWORD=secure-password-123 \
  invari:latest
```

---

## Sharing the Docker Image

### Push to Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag the image
docker tag invari:latest dhritiman/invari:latest

# Push to Docker Hub
docker push dhritiman/invari:latest
```

### Others Can Pull and Run

```bash
# Pull the image
docker pull your-dockerhub-username/invari:latest

# Run with docker-compose (just update docker-compose.yml)
# Change:
#   build: .
# To:
#   image: your-dockerhub-username/invari:latest

docker-compose up
```

---

## Multi-Architecture Builds

Invari supports building for **9 different CPU architectures**, enabling deployment across diverse hardware platforms from cloud servers to edge devices and mainframes.

### Supported Platforms

| Platform | Description | Use Cases |
|----------|-------------|-----------|
| `linux/amd64` | Standard Intel/AMD 64-bit | Most cloud VMs, traditional servers |
| `linux/amd64/v2` | AMD64 with AVX/SSE4 | Modern x86_64 CPUs (2009+) |
| `linux/arm64` | ARM 64-bit | Apple Silicon, AWS Graviton, ARM servers |
| `linux/arm/v7` | ARM 32-bit v7 | Raspberry Pi 2/3/4, IoT devices |
| `linux/arm/v6` | ARM 32-bit v6 | Raspberry Pi Zero/1, older ARM |
| `linux/386` | Intel/AMD 32-bit | Legacy x86 systems |
| `linux/riscv64` | RISC-V 64-bit | RISC-V development boards |
| `linux/ppc64le` | IBM POWER (LE) | IBM POWER8/9 servers |
| `linux/s390x` | IBM Z Mainframe | IBM z/Architecture mainframes |

### Prerequisites

```bash
# Verify Docker Buildx is installed
docker buildx version

# Create a multi-platform builder
docker buildx create --name multiarch-builder --driver docker-container --use

# Bootstrap the builder (downloads QEMU and cross-compilation tools)
docker buildx inspect --bootstrap

# Verify all platforms are available
docker buildx inspect multiarch-builder --bootstrap
```

### Build for All Platforms

**Full 9-platform build:**

```bash
# Login to Docker Hub
docker login

# Build and push for all 9 architectures
docker buildx build \
  --platform linux/amd64,linux/amd64/v2,linux/arm64,linux/arm/v7,linux/arm/v6,linux/386,linux/riscv64,linux/ppc64le,linux/s390x \
  -t dhritiman/invari:latest \
  -t dhritiman/invari:v1.0.0 \
  --push \
  .
```

**Note:** Building all 9 platforms takes significantly longer (~30-60 minutes depending on your machine). Consider building common platforms first.

### Recommended Platform Subsets

**Option 1: Most Common (ARM + x86 only)**

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t dhritiman/invari:latest \
  --push \
  .
```

**Option 2: Cloud + Edge (5 platforms)**

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7,linux/386,linux/ppc64le \
  -t dhritiman/invari:latest \
  --push \
  .
```

**Option 3: Production + IoT (6 platforms)**

```bash
docker buildx build \
  --platform linux/amd64,linux/amd64/v2,linux/arm64,linux/arm/v7,linux/arm/v6,linux/386 \
  -t dhritiman/invari:latest \
  --push \
  .
```

### Build Script for Automation

Create `build-multiarch.sh`:

```bash
#!/bin/bash
set -e

# Configuration
IMAGE_NAME="dhritiman/invari"
VERSION="${1:-latest}"
PLATFORMS="linux/amd64,linux/amd64/v2,linux/arm64,linux/arm/v7,linux/arm/v6,linux/386,linux/riscv64,linux/ppc64le,linux/s390x"

echo "🔨 Building Invari multi-architecture image"
echo "📦 Image: $IMAGE_NAME:$VERSION"
echo "🏗️  Platforms: $PLATFORMS"
echo ""

# Ensure buildx builder exists
if ! docker buildx inspect multiarch-builder >/dev/null 2>&1; then
  echo "Creating buildx builder..."
  docker buildx create --name multiarch-builder --driver docker-container --use
fi

# Use the builder
docker buildx use multiarch-builder

# Build and push
docker buildx build \
  --platform "$PLATFORMS" \
  -t "$IMAGE_NAME:$VERSION" \
  -t "$IMAGE_NAME:latest" \
  --label "org.opencontainers.image.title=Invari" \
  --label "org.opencontainers.image.description=API Validation and Security Platform for AI Agents" \
  --label "org.opencontainers.image.version=$VERSION" \
  --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --cache-from type=registry,ref="$IMAGE_NAME:buildcache" \
  --cache-to type=registry,ref="$IMAGE_NAME:buildcache",mode=max \
  --push \
  .

echo "✅ Build complete!"
echo "🔍 Verify with: docker buildx imagetools inspect $IMAGE_NAME:$VERSION"
```

Make it executable:

```bash
chmod +x build-multiarch.sh

# Build with version tag
./build-multiarch.sh v1.0.0

# Build as latest
./build-multiarch.sh
```

### Verify Multi-Architecture Image

```bash
# Inspect the manifest to see all architectures
docker buildx imagetools inspect dhritiman/invari:latest

# Expected output shows all 9 platforms:
# Manifests:
#   Name:      docker.io/dhritiman/invari:latest@sha256:...
#   MediaType: application/vnd.docker.distribution.manifest.v2+json
#   Platform:  linux/amd64
#
#   Name:      docker.io/dhritiman/invari:latest@sha256:...
#   Platform:  linux/amd64/v2
#   ... (and 7 more)
```

### Test on Specific Architecture

```bash
# Force pull AMD64 version (even on ARM Mac)
docker pull --platform linux/amd64 dhritiman/invari:latest

# Force pull ARM64 version (even on x86 server)
docker pull --platform linux/arm64 dhritiman/invari:latest

# Test which architecture was pulled
docker run --rm dhritiman/invari:latest uname -m
```

### Platform-Specific Notes

**ARM64 & ARM v7/v6:**
- Node.js 20 Alpine has excellent ARM support
- PostgreSQL client works on all ARM variants
- ARM v6 (Pi Zero) may be slower but fully functional

**RISC-V:**
- Emerging architecture, limited production use
- Node.js RISC-V support is experimental
- Use for development/testing only

**IBM POWER (ppc64le) & Z (s390x):**
- Enterprise mainframe support
- Fully supported by Node.js and Alpine Linux
- Ideal for enterprise/banking workloads

**32-bit (386, ARM v6/v7):**
- Limited to 4GB RAM per process
- Suitable for small-scale deployments
- Consider 64-bit platforms for production

### Build Time Optimization

**Use Build Cache:**

```bash
# Cache to registry for faster subsequent builds
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6,linux/386,linux/riscv64,linux/ppc64le,linux/s390x,linux/amd64/v2 \
  --cache-from type=registry,ref=dhritiman/invari:buildcache \
  --cache-to type=registry,ref=dhritiman/invari:buildcache,mode=max \
  -t dhritiman/invari:latest \
  --push \
  .
```

**Parallel Build Performance:**

- Buildx builds all platforms in parallel
- Build time ≈ slowest platform + overhead
- Expect 20-40 minutes for all 9 platforms
- 2-5 minutes for just AMD64 + ARM64

### Dockerfile Compatibility

Your current `Dockerfile` is **already compatible** with all platforms because:

✅ Uses `node:20-alpine` (multi-arch base image)
✅ Uses `postgresql-client` from Alpine repos (available on all platforms)
✅ No architecture-specific binaries or dependencies
✅ Pure Node.js/TypeScript code (cross-platform)

### Troubleshooting Multi-Arch Builds

**Error: "multiple platforms feature is currently not supported"**

```bash
# Use docker-container driver instead of default
docker buildx create --driver docker-container --name multiarch --use
```

**Error: "failed to solve: process ... platform linux/riscv64 not supported"**

```bash
# Ensure QEMU is installed
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

# Recreate builder
docker buildx rm multiarch-builder
docker buildx create --name multiarch-builder --driver docker-container --use
docker buildx inspect --bootstrap
```

**Build hangs or is extremely slow:**

```bash
# RISC-V and s390x can be slow (emulation overhead)
# Build without those platforms if not needed:
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7,linux/arm/v6 \
  -t dhritiman/invari:latest \
  --push \
  .
```

**"Cannot use --load with multiple platforms":**

```bash
# --load only works with single platform
# For local testing, build for current platform:
docker buildx build --platform linux/arm64 -t invari:test --load .

# For multi-platform, must use --push to registry
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t dhritiman/invari:latest \
  --push \
  .
```

### GitHub Actions CI/CD (Optional)

Create `.github/workflows/docker-multiarch.yml`:

```yaml
name: Multi-Architecture Docker Build

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:

env:
  IMAGE_NAME: dhritiman/invari

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/amd64/v2,linux/arm64,linux/arm/v7,linux/arm/v6,linux/386,linux/riscv64,linux/ppc64le,linux/s390x
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.IMAGE_NAME }}:buildcache,mode=max

      - name: Verify image
        run: |
          docker buildx imagetools inspect ${{ env.IMAGE_NAME }}:latest
```

Add GitHub Secrets:
- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub access token (not password!)

### Quick Reference

```bash
# Setup (one-time)
docker buildx create --name multiarch --driver docker-container --use
docker buildx inspect --bootstrap

# Build all platforms
docker buildx build \
  --platform linux/amd64,linux/amd64/v2,linux/arm64,linux/arm/v7,linux/arm/v6,linux/386,linux/riscv64,linux/ppc64le,linux/s390x \
  -t dhritiman/invari:latest \
  --push .

# Verify
docker buildx imagetools inspect dhritiman/invari:latest

# Test specific platform
docker pull --platform linux/arm64 dhritiman/invari:latest
docker run --rm dhritiman/invari:latest uname -m
```

---

## Production Deployment

### Recommended Setup

1. **Use a managed PostgreSQL** (AWS RDS, Google Cloud SQL, etc.)
2. **Set strong JWT_SECRET**
3. **Configure CORS_ORIGIN** to your actual domain
4. **Use environment-specific .env files**
5. **Set up SSL/TLS** (nginx proxy or cloud load balancer)
6. **Enable backups** for PostgreSQL volume
7. **Monitor with health checks**

### Example Production docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    image: your-dockerhub/invari:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: https://yourdomain.com
      NODE_ENV: production
      ENABLE_CRON: true
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check if PostgreSQL is ready
docker-compose exec db pg_isready -U invari
```

### Database Connection Failed

```bash
# Verify DATABASE_URL is correct
docker-compose exec app env | grep DATABASE_URL

# Test connection
docker-compose exec app node -e "console.log(process.env.DATABASE_URL)"
```

### Port Already in Use

```bash
# Change PORT in .env
PORT=3001

# Or stop conflicting service
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Need to Reset Database

```bash
# Stop everything and remove volumes
docker-compose down -v

# Start fresh
docker-compose up
```

### Can't Login / Forgot Password

If you're locked out or forgot the admin password:

```bash
# Stop the container
docker-compose down

# Edit .env and set new default credentials
nano .env
# Update: DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD

# Manually delete all users from database
docker-compose up -d db
docker-compose exec db psql -U invari -d invari -c "DELETE FROM users;"

# Restart app (will recreate default user)
docker-compose up -d app
```

---

## Architecture

```
┌─────────────────────────────────────┐
│   Docker Container: invari-app      │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Web Console (React SPA)     │  │
│  │  Served at: /                │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Engine (Node.js/Express)    │  │
│  │  API at: /api/*              │  │
│  │  Proxy at: /proxy/*          │  │
│  └──────────────────────────────┘  │
│                                     │
│  Port: 3000                         │
└─────────────────────────────────────┘
                 │
                 │ DATABASE_URL
                 ▼
┌─────────────────────────────────────┐
│   Docker Container: invari-db       │
│   PostgreSQL 15                     │
│   Port: 5432                        │
└─────────────────────────────────────┘
```

---

## Development vs Production

### Development (Local)

```bash
# Use docker-compose for local development
docker-compose up

# Or run without Docker:
pnpm install
pnpm dev:all
```

### Production (Deployment)

```bash
# Build and push image
docker build -t your-dockerhub/invari:latest .
docker push your-dockerhub/invari:latest

# On server: pull and run
docker pull your-dockerhub/invari:latest
docker-compose up -d
```

---

## Health Check

The container includes a health check that runs every 30 seconds:

```bash
# Check health status
docker inspect invari-app | grep -A 10 Health

# Manual health check
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-02-23T12:00:00.000Z"
}
```

---

## Support

For issues and questions:
- GitHub Issues: [your-repo/issues]
- Documentation: [your-docs-url]
- Docker Hub: [your-dockerhub/invari]

---

**Built with pnpm monorepo, Node.js 20, PostgreSQL 15, and Docker**
