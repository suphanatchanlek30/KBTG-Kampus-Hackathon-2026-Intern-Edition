
DB_URL      ?= postgres://ksure:ksure_dev_only@localhost:5432/ksure?sslmode=disable
TEST_DB_URL ?= postgres://ksure:ksure_dev_only@localhost:5432/ksure_test?sslmode=disable
GOBIN  := $(shell go env GOPATH)/bin
GOOSE  := $(GOBIN)/goose -dir backend/migrations postgres "$(DB_URL)"

.PHONY: help up down logs ps migrate migrate-down seed db-reset test sqlc dev tools

help: ## List available commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-13s %s\n", $$1, $$2}'

up: ## Start database, API, and Adminer; the API runs migrations on startup
	docker compose --profile tools up -d --build --wait db api
	docker compose --profile tools up -d adminer
	@echo "api     http://localhost:8080/api/v1/readyz"
	@echo "adminer http://localhost:8081  (server: db · user: ksure · pass: ksure_dev_only · db: ksure)"

down: ## Stop containers and keep the database volume
	docker compose --profile tools down

logs: ## Follow API logs
	docker compose logs -f api

ps: ## Show container status
	docker compose --profile tools ps

migrate: ## goose up
	$(GOOSE) up

migrate-down: ## Roll back one migration
	$(GOOSE) down

seed: ## Reset demo deals and seed users, accounts, and properties
	$(GOOSE) down-to 1
	$(GOOSE) up

db-reset: ## Reset the schema, then migrate and seed
	$(GOOSE) reset
	$(GOOSE) up

test: ## Run backend tests against the separate ksure_test database; requires make up
	@docker compose exec -T db psql -U ksure -d ksure -tAc "SELECT 1 FROM pg_database WHERE datname = 'ksure_test'" | grep -q 1 \
		|| docker compose exec -T db createdb -U ksure ksure_test
	cd backend && TEST_DATABASE_URL="$(TEST_DB_URL)" go test -count=1 ./...

sqlc: ## Generate repository code from SQL queries
	cd backend && $(GOBIN)/sqlc generate

dev: ## Run the API with hot reload; start db and stop the API container first
	cd backend && DATABASE_URL="$(DB_URL)" JWT_SECRET=dev-only-secret-change-me-0123456789abcdef \
		DEMO_TOOLS_ENABLED=true $(GOBIN)/air

tools: ## Install goose, sqlc, and air
	go install github.com/pressly/goose/v3/cmd/goose@v3.29.0
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1
	go install github.com/air-verse/air@v1.67.4
