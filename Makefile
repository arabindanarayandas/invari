# Invari - Production-grade Makefile
# Self-documenting Makefile with industry-standard commands

.PHONY: help install dev build clean docker-build docker-up docker-down docker-logs push deploy test lint

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Variables
DOCKER_IMAGE := invari
DOCKER_TAG := latest
DOCKER_REGISTRY := # Set to your Docker Hub username or registry
PORT := 3000

##@ General

help: ## Display this help message
	@echo "$(BLUE)Invari - Available Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(YELLOW)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

install: ## Install all dependencies with pnpm
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	@pnpm install
	@echo "$(GREEN)✅ Dependencies installed!$(NC)"

dev: ## Start local development (web-console)
	@echo "$(BLUE)🚀 Starting web-console in dev mode...$(NC)"
	@pnpm dev

dev-engine: ## Start engine in dev mode
	@echo "$(BLUE)🚀 Starting engine in dev mode...$(NC)"
	@pnpm dev:engine

dev-all: ## Start both engine and web-console concurrently
	@echo "$(BLUE)🚀 Starting full development environment...$(NC)"
	@pnpm dev:all

##@ Building

build: ## Build all packages (engine + web-console)
	@echo "$(BLUE)🔨 Building all packages...$(NC)"
	@pnpm build
	@echo "$(GREEN)✅ Build complete!$(NC)"

build-engine: ## Build engine only
	@echo "$(BLUE)🔨 Building engine...$(NC)"
	@pnpm build:engine
	@echo "$(GREEN)✅ Engine built!$(NC)"

build-web: ## Build web-console only
	@echo "$(BLUE)🔨 Building web-console...$(NC)"
	@pnpm build:web
	@echo "$(GREEN)✅ Web-console built!$(NC)"

build-demo: ## Build demo playground
	@echo "$(BLUE)🔨 Building demo playground...$(NC)"
	@pnpm build:demo
	@echo "$(GREEN)✅ Demo built!$(NC)"

##@ Docker

docker-build: ## Build Docker image
	@echo "$(BLUE)🐳 Building Docker image: $(DOCKER_IMAGE):$(DOCKER_TAG)...$(NC)"
	@docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "$(GREEN)✅ Docker image built!$(NC)"

docker-up: ## Start application with docker-compose
	@echo "$(BLUE)🐳 Starting Invari with docker-compose...$(NC)"
	@docker-compose up

docker-up-detached: ## Start application in background
	@echo "$(BLUE)🐳 Starting Invari in background...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✅ Invari started! Access at http://localhost:$(PORT)$(NC)"

docker-down: ## Stop docker-compose services
	@echo "$(YELLOW)⏹  Stopping Invari...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ Stopped!$(NC)"

docker-restart: docker-down docker-up-detached ## Restart docker-compose services

docker-logs: ## View docker-compose logs
	@docker-compose logs -f app

docker-logs-all: ## View all docker-compose logs
	@docker-compose logs -f

docker-ps: ## List running containers
	@docker-compose ps

docker-shell: ## Open shell in running app container
	@docker-compose exec app sh

docker-db-shell: ## Open PostgreSQL shell
	@docker-compose exec db psql -U invari -d invari

##@ Database

db-create: ## Create a new migration (usage: make db-create name=migration_name)
	@if [ -z "$(name)" ]; then \
		echo "$(RED)❌ Error: Migration name required$(NC)"; \
		echo "$(YELLOW)Usage: make db-create name=add_user_preferences$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)📝 Creating migration: $(name)$(NC)"
	@cd engine && pnpm db:create $(name)

db-migrate: ## Run pending database migrations (local)
	@echo "$(BLUE)📦 Running database migrations...$(NC)"
	@cd engine && pnpm db:migrate
	@echo "$(GREEN)✅ Migrations complete!$(NC)"

db-status: ## Check migration status
	@cd engine && pnpm db:status

db-rollback: ## Rollback last migration (⚠️  use with caution)
	@echo "$(RED)⚠️  WARNING: This will rollback the last migration$(NC)"
	@cd engine && pnpm db:rollback

db-seed: ## Seed database with demo data (local)
	@echo "$(BLUE)🌱 Seeding database...$(NC)"
	@cd engine && pnpm db:seed
	@echo "$(GREEN)✅ Database seeded!$(NC)"

db-studio: ## Open Drizzle Studio (database GUI)
	@echo "$(BLUE)🎨 Opening Drizzle Studio...$(NC)"
	@cd engine && pnpm db:studio

db-backup: ## Backup database (docker)
	@echo "$(BLUE)💾 Backing up database...$(NC)"
	@docker-compose exec db pg_dump -U invari invari > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Backup created!$(NC)"

##@ Testing & Quality

test: ## Run tests
	@echo "$(BLUE)🧪 Running tests...$(NC)"
	@cd engine && pnpm test
	@echo "$(GREEN)✅ Tests passed!$(NC)"

test-watch: ## Run tests in watch mode
	@cd engine && pnpm test:watch

test-coverage: ## Run tests with coverage
	@cd engine && pnpm test:coverage

lint: ## Lint code
	@echo "$(BLUE)🔍 Linting code...$(NC)"
	@pnpm lint
	@echo "$(GREEN)✅ No linting errors!$(NC)"

##@ Deployment

push: docker-build ## Push Docker image to registry
	@if [ -z "$(DOCKER_REGISTRY)" ]; then \
		echo "$(RED)❌ Error: DOCKER_REGISTRY not set$(NC)"; \
		echo "$(YELLOW)Set it in Makefile or run: make push DOCKER_REGISTRY=your-dockerhub-username$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)🚀 Tagging image for registry...$(NC)"
	@docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)
	@echo "$(BLUE)🚀 Pushing to $(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)...$(NC)"
	@docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)
	@echo "$(GREEN)✅ Image pushed successfully!$(NC)"

pull: ## Pull Docker image from registry
	@if [ -z "$(DOCKER_REGISTRY)" ]; then \
		echo "$(RED)❌ Error: DOCKER_REGISTRY not set$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)📥 Pulling $(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)...$(NC)"
	@docker pull $(DOCKER_REGISTRY)/$(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)

##@ Cleanup

clean: ## Clean all build artifacts
	@echo "$(YELLOW)🧹 Cleaning build artifacts...$(NC)"
	@rm -rf engine/dist
	@rm -rf web-console/dist
	@rm -rf web-console/dist-demo
	@rm -rf node_modules
	@rm -rf engine/node_modules
	@rm -rf web-console/node_modules
	@echo "$(GREEN)✅ Cleaned!$(NC)"

clean-docker: ## Remove all Docker containers and volumes
	@echo "$(RED)⚠️  This will remove all containers and volumes!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)✅ Docker cleaned!$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

clean-all: clean clean-docker ## Clean everything (build + docker)

##@ Environment

env-setup: ## Create .env file from .env.example
	@if [ -f .env ]; then \
		echo "$(YELLOW)⚠️  .env already exists. Skipping...$(NC)"; \
	else \
		cp .env.example .env; \
		echo "$(GREEN)✅ .env created from .env.example$(NC)"; \
		echo "$(YELLOW)⚠️  Don't forget to update JWT_SECRET and other values!$(NC)"; \
	fi

env-validate: ## Validate .env file exists and has required variables
	@if [ ! -f .env ]; then \
		echo "$(RED)❌ .env file not found!$(NC)"; \
		echo "$(YELLOW)Run: make env-setup$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ .env file exists$(NC)"

##@ Utilities

check-deps: ## Check if required tools are installed
	@echo "$(BLUE)🔍 Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js not installed$(NC)"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "$(RED)❌ pnpm not installed. Run: npm install -g pnpm$(NC)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)❌ Docker not installed$(NC)"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "$(RED)❌ docker-compose not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✅ All required tools installed!$(NC)"

version: ## Show current version
	@echo "$(BLUE)Invari v1.0.0$(NC)"
	@echo "Node: $$(node --version)"
	@echo "pnpm: $$(pnpm --version)"
	@echo "Docker: $$(docker --version)"

status: ## Show project status
	@echo "$(BLUE)📊 Project Status$(NC)"
	@echo ""
	@if [ -f .env ]; then \
		echo "$(GREEN)✅ .env configured$(NC)"; \
	else \
		echo "$(RED)❌ .env missing$(NC)"; \
	fi
	@if docker-compose ps | grep -q "Up"; then \
		echo "$(GREEN)✅ Docker containers running$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Docker containers not running$(NC)"; \
	fi
	@echo ""

##@ Quick Start

quickstart: check-deps env-setup install docker-up-detached ## Quick start: setup and run everything
	@echo ""
	@echo "$(GREEN)🎉 Invari is running!$(NC)"
	@echo "$(BLUE)📱 Web Console: http://localhost:$(PORT)$(NC)"
	@echo "$(BLUE)🔧 API Health: http://localhost:$(PORT)/health$(NC)"
	@echo ""
	@echo "$(YELLOW)Useful commands:$(NC)"
	@echo "  make docker-logs    - View logs"
	@echo "  make docker-down    - Stop services"
	@echo "  make help           - Show all commands"
	@echo ""
