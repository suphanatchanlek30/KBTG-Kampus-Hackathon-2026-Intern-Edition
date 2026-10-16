# คำสั่งลัดของ repo — ต้องมี Docker, Go และ goose/sqlc/air (make tools)
# DB ใน docker compose เปิดพอร์ต 5432 ไว้ให้คำสั่งบนเครื่องใช้ได้

DB_URL ?= postgres://ksure:ksure_dev_only@localhost:5432/ksure?sslmode=disable
GOBIN  := $(shell go env GOPATH)/bin
GOOSE  := $(GOBIN)/goose -dir backend/migrations postgres "$(DB_URL)"

.PHONY: help up down logs ps migrate migrate-down seed db-reset test sqlc dev tools

help: ## แสดงคำสั่งทั้งหมด
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-13s %s\n", $$1, $$2}'

up: ## เปิด db + api + adminer (build ใหม่ถ้าโค้ดเปลี่ยน) — api รัน migration เองตอน start
	docker compose --profile tools up -d --build --wait db api
	docker compose --profile tools up -d adminer
	@echo "api     http://localhost:8080/api/v1/readyz"
	@echo "adminer http://localhost:8081  (server: db · user: ksure · pass: ksure_dev_only · db: ksure)"

down: ## ปิดทุก container (ข้อมูลใน volume ยังอยู่)
	docker compose --profile tools down

logs: ## ดู log ของ api
	docker compose logs -f api

ps: ## สถานะ container
	docker compose --profile tools ps

migrate: ## goose up
	$(GOOSE) up

migrate-down: ## goose down ทีละ 1 version
	$(GOOSE) down

seed: ## ใส่ข้อมูลเดโมตั้งต้นใหม่ (ล้างดีลทั้งหมด แล้ว seed users/accounts/properties)
	$(GOOSE) down-to 1
	$(GOOSE) up

db-reset: ## ล้าง schema ทั้งหมดแล้ว migrate + seed ใหม่
	$(GOOSE) reset
	$(GOOSE) up

test: ## go test ทั้ง backend
	cd backend && go test ./...

sqlc: ## generate โค้ดจาก backend/internal/repository/queries
	cd backend && $(GOBIN)/sqlc generate

dev: ## รัน api บนเครื่องแบบ hot reload (air) — ต้องมี db ทำงาน และหยุด container api ก่อน (docker compose stop api)
	cd backend && DATABASE_URL="$(DB_URL)" JWT_SECRET=dev-only-secret-change-me-0123456789abcdef \
		DEMO_TOOLS_ENABLED=true $(GOBIN)/air

tools: ## ติดตั้ง goose / sqlc / air
	go install github.com/pressly/goose/v3/cmd/goose@v3.29.0
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1
	go install github.com/air-verse/air@v1.67.4
