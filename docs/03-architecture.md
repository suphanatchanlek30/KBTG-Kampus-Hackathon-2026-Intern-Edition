# 03 · Architecture & Folder Structure (ช่วง Prototype)

> ขอบเขตตอนนี้: **รันบนเครื่อง (local) ด้วย Docker** — ยังไม่ทำ AWS/EKS/Cognito/Terraform (เก็บไว้เฟสหลัง ดูสเปกต้นฉบับ [reference/poc-system-spec.th.md](./reference/poc-system-spec.th.md))

---

## 1. Tech stack

| ส่วน | เลือกใช้ | หมายเหตุ |
|---|---|---|
| Frontend | **Next.js (เวอร์ชันล่าสุด ณ วันที่ setup)** · App Router · **TypeScript** | สร้างด้วย `create-next-app@latest` — อย่า pin เวอร์ชันจากความจำ ให้ดูจาก `package.json` หลังสร้าง |
| Styling | **Tailwind CSS v4** (CSS-first, `@theme` ใน `globals.css`) | ติดมากับ `create-next-app` |
| HTTP client | **Axios** (instance เดียว + interceptors) | |
| Server state | **TanStack Query** | cache, retry, polling (`refetchInterval`) |
| Client state | **Zustand** | เก็บร่างดีล L2→L3, สถานะ UI |
| Form / validation | **react-hook-form + zod** | L2 |
| Animation | **motion** (`motion/react`) | ดู [02-ui-spec §5](./02-ui-spec.md#5-animation-spec-ค่าจริงที่ต้องใช้) |
| Icons | **lucide-react** | |
| QR | `qrcode.react` (สร้าง) · `@yudiel/react-qr-scanner` (สแกน, D12) | |
| บันทึกรูป | `html-to-image` | "บันทึก QR", "บันทึกหลักฐาน" |
| Utility | `clsx` + `tailwind-merge` (`cn()`) | |
| Backend | **Go (เวอร์ชัน stable ล่าสุด)** + **Fiber** | ตรวจว่า Fiber v3 ออก stable แล้วหรือยัง ถ้าใช่ใช้ v3 ไม่งั้นใช้ v2 — API ต่างกันเล็กน้อย (`fiber.Ctx` เป็น interface ใน v3) |
| DB driver | **pgx v5** (`pgxpool`) | |
| Query | **sqlc** (generate Go type-safe จาก SQL) | เขียน SQL เอง ได้ type ฟรี |
| Migration | **goose** | ไฟล์ `.sql` up/down |
| Validation | `go-playground/validator` | |
| Auth (demo) | JWT (`golang-jwt/jwt/v5`) ใน cookie `HttpOnly; SameSite=Lax` | ยังไม่ใช้ Cognito |
| Logging | `log/slog` (JSON) + request ID | |
| Hot reload | `air` | |
| Database | **PostgreSQL (เวอร์ชันล่าสุด)** ใน Docker | ใช้ image `postgres:<major>-alpine` ที่เป็น major ล่าสุดตอน setup |
| Test | Go `testing` + DB ใน Docker · Vitest + Testing Library · Playwright (E2E 2 role) | |

### การตัดสินใจสำคัญ

1. **Frontend เรียก API ผ่าน Next.js rewrites** (`/api/*` → `http://localhost:8080/api/*`)
   → browser เห็นเป็น origin เดียวกัน: ไม่ต้องตั้ง CORS, cookie ใช้ได้เลย, เปิดจากมือถือผ่าน IP ในวง LAN ได้
2. **Real-time ใช้ polling** (TanStack Query `refetchInterval: 3000` เฉพาะหน้า L5/D8/T1) — ง่ายและพอสำหรับเดโม ถ้ามีเวลาค่อยอัปเกรดเป็น SSE (`GET /api/v1/deals/{id}/events/stream`)
3. **เงินเป็น integer สตางค์ทุกชั้น** (DB `BIGINT`, Go `int64`, JSON number, TS `number`) — format ตอนแสดงผลเท่านั้น
4. **Server เป็นผู้กำหนด state** — frontend แค่ส่ง intent + `version` + `Idempotency-Key`
5. **UI ทำก่อนด้วย mock data** (Phase 2) → สลับเป็น API จริงทีหลังโดยเปลี่ยนแค่ชั้น `api/` (ดู §3.3)

---

## 2. ภาพรวมระบบ (local)

```mermaid
flowchart LR
  subgraph Phone["มือถือ / เบราว์เซอร์"]
    UI[Next.js UI]
  end
  subgraph Host["เครื่อง dev"]
    NX[Next.js dev server :3000<br/>rewrites /api/* →]
    subgraph Docker["docker compose"]
      API[Go Fiber API :8080<br/>+ expiry worker]
      PG[(PostgreSQL :5432)]
      ADM[Adminer :8081<br/>ดู DB - optional]
    end
  end
  UI -->|HTTPS/HTTP| NX
  NX -->|/api/*| API
  API -->|pgx| PG
  ADM --> PG
```

- **expiry worker** = goroutine ใน API ทำงานทุก 30 วินาที หา deal ที่ `expires_at < now()` หรือคำเชิญหมดอายุ แล้วเปลี่ยน state + คืนเงิน (ดู [04-database §6](./04-database.md#6-transaction-ของแต่ละ-action))
- กล้อง (D12 สแกน QR) บนมือถือ **ต้องเป็น HTTPS** → ใช้ `next dev --experimental-https` หรือ tunnel (`cloudflared` / `ngrok`) ตอนเดโม

---

## 3. โครงสร้างโฟลเดอร์ (Monorepo)

```text
KBTG Kampus/                      ← repo root
├── README.md
├── Makefile                      ← คำสั่งลัด: make dev, make db-reset, make test
├── docker-compose.yml            ← postgres + api (+ adminer)
├── .env.example                  ← ตัวแปรทั้งหมด (ห้าม commit .env จริง)
├── .gitignore
├── .editorconfig
│
├── docs/                         ← เอกสารออกแบบ (ไฟล์ชุดนี้)
│   ├── 01-user-flow.md
│   ├── 02-ui-spec.md
│   ├── 03-architecture.md
│   ├── 04-database.md
│   ├── 05-api.md
│   ├── 06-roadmap.md
│   ├── 07-assets.md
│   ├── design/                   ← รูป mockup อ้างอิง (L1–L6, T1–T8, foundations)
│   └── reference/                ← สเปกต้นฉบับ
│
├── assets/                       ← ไฟล์ต้นฉบับที่คุณหามาใส่ (โลโก้, ไอคอน, ฟอนต์ ...)
│   ├── brand/  app-icons/  icons/  illustrations/  backgrounds/  fonts/  sounds/
│   └── README.md
│
├── frontend/                     ← Next.js (สร้างใน Phase 1)
└── backend/                      ← Go Fiber (สร้างใน Phase 4)
```

> `frontend/` และ `backend/` **ยังไม่สร้าง** เพราะ `create-next-app` ต้องการโฟลเดอร์ว่าง — คำสั่งสร้างอยู่ใน [06-roadmap.md](./06-roadmap.md)
> ไฟล์ใน `assets/` จะถูก **copy** ไป `frontend/public/` ตอน Phase 1 (`assets/` = ต้นฉบับ, `public/` = ที่เว็บใช้จริง)

### 3.1 Frontend (`frontend/`) — feature-based

```text
frontend/
├── public/
│   ├── brand/            ksure-logo.svg, ksure-mark.svg
│   ├── icons/            app icons, illustration SVG
│   ├── images/           bg-curves.svg
│   └── manifest.webmanifest
├── src/
│   ├── app/                              ← Routing เท่านั้น (บาง ไม่มี logic)
│   │   ├── layout.tsx                    ← ฟอนต์, Providers, PhoneFrame
│   │   ├── globals.css                   ← Tailwind v4 + @theme tokens
│   │   ├── page.tsx                      ← redirect → /home หรือ /login
│   │   ├── (auth)/login/page.tsx         ← D0
│   │   ├── (app)/
│   │   │   ├── layout.tsx                ← AuthGuard + AppShell
│   │   │   ├── template.tsx              ← page enter animation
│   │   │   ├── home/page.tsx             ← L1 / T1
│   │   │   ├── deals/new/page.tsx        ← L2
│   │   │   ├── deals/new/review/page.tsx ← L3
│   │   │   ├── deals/[id]/page.tsx       ← L5 / D1 / D8
│   │   │   ├── deals/[id]/share/page.tsx ← L4
│   │   │   ├── deals/[id]/lock/page.tsx  ← T3 / D2
│   │   │   ├── deals/[id]/locked/page.tsx           ← T4
│   │   │   ├── deals/[id]/confirm-viewing/page.tsx  ← T5
│   │   │   ├── deals/[id]/confirm-move-in/page.tsx  ← T6
│   │   │   ├── deals/[id]/complete/page.tsx         ← L6 / T7
│   │   │   ├── deals/[id]/result/page.tsx           ← D3
│   │   │   ├── invites/[code]/page.tsx   ← T2 / D6
│   │   │   ├── transfer/page.tsx         ← โอนเงิน + T8
│   │   │   ├── notifications/page.tsx    ← D7
│   │   │   └── scan/page.tsx             ← D12
│   │   └── dev/                          ← เฉพาะ dev: แคตตาล็อก component, overlay เทียบ mockup
│   │
│   ├── features/                         ← โค้ดตาม feature (screen + logic)
│   │   ├── auth/        { api.ts, hooks.ts, components/DemoLogin.tsx }
│   │   ├── home/        { components/LandlordHome.tsx, TenantHome.tsx, BalanceCard.tsx, ServiceGrid.tsx, PromoBanner.tsx, RequestCard.tsx }
│   │   ├── deals/
│   │   │   ├── api.ts                    ← เรียก Axios (หรือ mock)
│   │   │   ├── hooks.ts                  ← useDeal, useCreateDeal, useLockDeal ...
│   │   │   ├── store.ts                  ← Zustand: ร่างดีล L2→L3
│   │   │   ├── schema.ts                 ← zod schema ฟอร์ม L2
│   │   │   ├── state.ts                  ← map state → badge/ข้อความ/ปุ่ม/route
│   │   │   └── components/               ← CreateDealForm, ReviewDeal, ShareInvite, DealStatus,
│   │   │                                    FundsSecuredCard, Timeline, ConfirmViewing, ConfirmMoveIn ...
│   │   ├── invites/     { api.ts, hooks.ts, components/InviteReview.tsx }
│   │   ├── lock/        { components/FaceIdScan.tsx, PinPad.tsx, LockSuccess.tsx }
│   │   ├── receipt/     { components/ReceiptCard.tsx, CompleteScreen.tsx, useSaveAsImage.ts }
│   │   ├── transfer/    { api.ts, components/TransferForm.tsx, OffDealWarningSheet.tsx }
│   │   └── notifications/ { api.ts, hooks.ts, components/NotificationList.tsx }
│   │
│   ├── components/
│   │   ├── ui/          Button, Card, Badge, AppHeader, BottomNav, BottomSheet, Toast,
│   │   │                Skeleton, SegmentedControl, CheckList, Stepper3, StepTabs ...
│   │   ├── motion/      SuccessHero, RippleRings, CheckDraw, CountUp, Sparkles, PulseRing, Shimmer
│   │   └── layout/      PhoneFrame, StatusBar, HomeIndicator, AppShell, StickyFooter
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                 ← Axios instance + interceptors
│   │   │   ├── errors.ts                 ← ApiError + map code → ข้อความไทย
│   │   │   └── idempotency.ts            ← สร้าง/จำ Idempotency-Key ต่อ action
│   │   ├── format/      money.ts, date.ts (พ.ศ.), account.ts (mask, ชื่อย่อ)
│   │   ├── haptics.ts
│   │   └── cn.ts
│   ├── mocks/                            ← Phase 2: fixture ค่าตรง mockup + mock adapter
│   │   ├── fixtures.ts
│   │   └── handlers.ts
│   ├── config/
│   │   ├── brand.ts                      ← ⚠️ ชื่อแบรนด์/ข้อความแบรนด์ทั้งหมดอยู่ที่นี่ที่เดียว
│   │   └── env.ts
│   ├── providers/       QueryProvider.tsx, ToastProvider.tsx
│   └── types/           api.ts (DTO ตรงกับ 05-api.md), deal.ts
├── tests/e2e/                            ← Playwright: landlord.spec.ts, tenant.spec.ts, full-deal.spec.ts
├── next.config.ts                        ← rewrites /api → backend
├── .env.local.example
└── package.json
```

**กติกา:**
- `app/**/page.tsx` แค่ import component จาก `features/` มาแสดง — ไม่เขียน logic ใน page
- ข้อความแบรนด์ ("K Sure", "K PLUS", ชื่อธนาคาร) อยู่ใน `config/brand.ts` ที่เดียว → เปลี่ยนชื่อทั้งแอปได้ใน 1 ไฟล์
- ห้ามใช้ hex สีใน component — ใช้ token จาก `@theme`

### 3.2 Axios client (แนวทาง)

```ts
// src/lib/api/client.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "/api/v1",          // ผ่าน Next rewrites
  withCredentials: true,
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  config.headers["X-Request-ID"] ??= crypto.randomUUID();
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // แปลง { error: { code, message } } → ApiError, 401 → ไปหน้า /login
    return Promise.reject(toApiError(err));
  },
);
```

```ts
// next.config.ts
const nextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_ORIGIN}/api/:path*` }];
  },
};
```

### 3.3 สลับ mock ↔ API จริง

`features/*/api.ts` export ฟังก์ชันเดียวกันทั้งสองโหมด:

```ts
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
export const getDeal = (id: string) => (USE_MOCK ? mock.getDeal(id) : api.get<DealDTO>(`/deals/${id}`).then(r => r.data));
```

→ Phase 2 ทำ UI ทั้งหมดด้วย `NEXT_PUBLIC_USE_MOCK=true` · Phase 7 เปลี่ยนเป็น `false`

### 3.4 Backend (`backend/`) — layered (handler → service → repository)

```text
backend/
├── cmd/
│   └── api/main.go                 ← อ่าน config, ต่อ DB, สร้าง Fiber app, start worker, graceful shutdown
├── internal/
│   ├── config/config.go            ← อ่าน env
│   ├── server/
│   │   ├── server.go               ← สร้าง fiber.App, error handler กลาง
│   │   ├── routes.go               ← ผูก path → handler (ดู 05-api.md)
│   │   └── middleware/             ← requestid, logger, recover, auth (JWT cookie), role guard, idempotency
│   ├── handler/                    ← HTTP เท่านั้น: parse/validate → เรียก service → ส่ง JSON
│   │   ├── auth_handler.go  deal_handler.go  invite_handler.go
│   │   ├── transfer_handler.go  notification_handler.go  demo_handler.go  health_handler.go
│   ├── service/                    ← Business logic + transaction
│   │   ├── deal_service.go         ← create / lock / confirm / cancel / reject
│   │   ├── statemachine.go         ← ตาราง transition ที่อนุญาต (pure function — test ง่าย)
│   │   ├── ledger_service.go       ← hold / release / refund → ปรับยอด demo_accounts
│   │   ├── expiry_worker.go
│   │   ├── transfer_service.go     ← precheck (T8) + โอนจำลอง
│   │   └── notification_service.go
│   ├── repository/                 ← sqlc generated + wrapper (WithTx)
│   │   ├── queries/*.sql           ← SQL ต้นฉบับให้ sqlc
│   │   └── db/                     ← โค้ดที่ sqlc generate (ห้ามแก้มือ)
│   ├── domain/                     ← type/enum/error ของธุรกิจ (DealState, EventType, AppError)
│   └── platform/
│       ├── database/postgres.go    ← pgxpool
│       └── token/                  ← สุ่ม invite token, hash, share code, ref no
├── migrations/                     ← goose: 0001_init.sql, 0002_seed_demo.sql ... (ฝังใน binary — api รัน goose up ตอน start)
├── api/openapi.yaml                ← สัญญา API (เขียนตาม 05-api.md)
├── sqlc.yaml
├── .air.toml
├── Dockerfile                      ← multi-stage, non-root
└── go.mod
```

> `Makefile` อยู่ที่ root ของ repo (คุมทั้ง docker compose และคำสั่ง Go) — `make help` ดูทั้งหมด

**กติกา:**
- handler **ห้าม** แตะ DB ตรง · service **ห้าม** รู้จัก Fiber
- ทุก action ที่เปลี่ยนเงิน/state อยู่ใน `service` และรันใน **transaction เดียว** (`repo.WithTx`)
- `statemachine.go` เป็น pure function: `Next(state, action, actor) (newStates []State, err)` → unit test ครบทุกคู่

### 3.5 docker-compose (แนวทาง)

ไฟล์จริง: [`docker-compose.yml`](../docker-compose.yml) — สรุปส่วนสำคัญ:

```yaml
services:
  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: ksure
      POSTGRES_PASSWORD: ksure_dev_only
      POSTGRES_DB: ksure
    ports: ["5432:5432"]
    # postgres 18+ เก็บข้อมูลใน /var/lib/postgresql/<major>/docker → mount ที่ /var/lib/postgresql (ไม่ใช่ .../data)
    volumes: [pgdata:/var/lib/postgresql]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ksure"]
      interval: 3s
      retries: 10

  api:
    build: ./backend
    env_file: [{ path: .env, required: false }]   # ไม่มี .env ก็ขึ้นได้
    environment:
      # บังคับชี้ service db เสมอ (ค่าใน .env เป็น localhost สำหรับรันบนเครื่อง)
      DATABASE_URL: postgres://ksure:ksure_dev_only@db:5432/ksure?sslmode=disable
      JWT_SECRET: ${JWT_SECRET:-dev-only-secret-...}
    ports: ["8080:8080"]
    depends_on:
      db: { condition: service_healthy }

  adminer:            # ดูข้อมูลใน DB ผ่านเว็บ (optional) — make up เปิดให้ด้วย
    image: adminer:6.1.2
    ports: ["8081:8080"]
    profiles: ["tools"]

volumes:
  pgdata:
```

Frontend รัน **นอก** Docker (`npm run dev`) เพื่อ hot reload เร็ว — ถ้าต้องการรันทั้งหมดใน Docker ให้เพิ่ม service `web` ใน profile `full`

### 3.6 Environment variables (`.env.example`)

| ตัวแปร | ตัวอย่าง | ใช้ที่ |
|---|---|---|
| `DATABASE_URL` | `postgres://ksure:ksure_dev_only@localhost:5432/ksure?sslmode=disable` | api — รันบนเครื่อง (`make dev`) · ใน compose ถูกบังคับเป็น `@db:5432` |
| `PORT` | `8080` | api |
| `JWT_SECRET` | (สุ่มยาว 32+ ตัว) | api |
| `APP_TZ` | `Asia/Bangkok` | api |
| `INVITE_TTL` | `24h` | api |
| `EXPIRY_TICK` | `30s` | api |
| `DEMO_TOOLS_ENABLED` | `true` | api — เปิด `/demo/*` |
| `MIGRATE_ON_START` | `true` | api — รัน goose up ตอน start |
| `LOG_LEVEL` | `info` | api — `debug` / `info` / `warn` / `error` |
| `API_ORIGIN` | `http://localhost:8080` | frontend (rewrites) |
| `NEXT_PUBLIC_USE_MOCK` | `true` / `false` | frontend |
| `NEXT_PUBLIC_SHOW_DEMO_BADGE` | `true` | frontend |
| `NEXT_PUBLIC_POLL_MS` | `3000` | frontend |

---

## 4. ความปลอดภัยที่ทำแม้เป็น Prototype

- ไม่มีเงินจริง/PIN จริง/OTP/Face ID จริง — PIN pad (D2) ไม่ส่งค่าไป server
- invite token สุ่มด้วย `crypto/rand` 32 bytes, เก็บเฉพาะ SHA-256 hash, หมดอายุ 24 ชม.
- `share_code` (`KS-8F4Q21`) ใช้ **ร่วมกับ** การล็อกอินเท่านั้น (ต้องเป็นผู้ใช้ role tenant)
- ตรวจ role + ตรวจว่าเป็นคู่ดีล ในทุก endpoint (ฝั่ง server)
- `Idempotency-Key` บังคับในทุก POST ที่เปลี่ยนเงิน/state
- Optimistic concurrency: ส่ง `version` มา ถ้าไม่ตรง → `409 VERSION_MISMATCH`
- Cookie `HttpOnly`, `SameSite=Lax`, (`Secure` เมื่อเป็น HTTPS)
- Log ไม่มี token/รหัสเต็ม · error ตอบเป็นรหัสคงที่ ไม่โชว์ stack
- Container ไม่รันเป็น root

---

## 5. การทดสอบ

| ระดับ | เครื่องมือ | ทดสอบอะไร |
|---|---|---|
| Unit (Go) | `go test` | `statemachine.go` ทุก transition (ถูก/ผิด), format ref no, การคำนวณยอด |
| Integration (Go) | `go test` + Postgres ใน Docker | lock → confirm → release, idempotency (ยิงซ้ำ 5 ครั้งได้ event เดียว), concurrent confirm 2 request พร้อมกัน, expiry ชนกับ confirm |
| Unit (FE) | Vitest | `formatBaht`, `formatThaiDate`, `deals/state.ts` |
| Component (FE) | Testing Library | ปุ่ม T5 กดไม่ได้จนติ๊กครบ, SplitBar คำนวณถูก |
| E2E | Playwright 2 browser context (landlord + tenant) | สคริปต์เดโมเต็ม [01-user-flow §9](./01-user-flow.md#9-สคริปต์เดโมบนเวที-2-เครื่อง-3-นาที) + reject + expire + T8 |
| Visual | Playwright screenshot ที่ 393×852 | เทียบกับ `docs/design/screens/*.png` |
