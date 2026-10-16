# 05 · API Spec (Go Fiber · REST · `/api/v1`)

> **เอกสารนี้คือที่นิยาม endpoint เพียงที่เดียว** · state/event ดู [04-database.md §2](./04-database.md#2-enums)
> สัญญาจริงจะเขียนเป็น `backend/api/openapi.yaml` ตามเอกสารนี้ (Phase 4)

---

## 1. ข้อตกลงทั่วไป

| เรื่อง | ข้อตกลง |
|---|---|
| Base path | `/api/v1` (frontend เรียกผ่าน Next rewrites → same-origin) |
| รูปแบบ JSON | `camelCase` · เวลาเป็น ISO-8601 มี offset (`2026-10-18T14:00:00+07:00`) · วันที่ล้วน `2026-11-01` |
| เงิน | **integer สตางค์** ชื่อลงท้าย `Satang` เช่น `totalSatang: 650000` — frontend format เอง |
| Auth | cookie `ks_session` (JWT, HttpOnly) — ได้จาก `POST /auth/demo-login` |
| Header ที่ต้องส่ง | `X-Request-ID` (ถ้าไม่ส่ง server สร้างให้ และส่งกลับใน response header) |
| Idempotency | ทุก `POST` ที่มี 🔁 **ต้อง** ส่ง `Idempotency-Key: <uuid>` — ส่งซ้ำ key เดิม = ได้ response เดิม ไม่ทำซ้ำ |
| Concurrency | action ที่เปลี่ยน state ส่ง `"version": <int>` ใน body — ไม่ตรง → `409 VERSION_MISMATCH` |
| Role | ตรวจที่ server เสมอ (🅛 = LANDLORD, 🅣 = TENANT, 🅟 = คู่ดีลทั้งสองฝ่าย) |

### รูปแบบ error

```json
{
  "error": {
    "code": "DEAL_STATE_CONFLICT",
    "message": "ดีลนี้ไม่อยู่ในสถานะที่ทำรายการนี้ได้",
    "requestId": "8c1f…"
  }
}
```

| HTTP | code | ใช้เมื่อ | frontend ทำอะไร |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | body ผิด (มี `details[]` บอก field) | แสดงใต้ช่องกรอก |
| 400 | `IDEMPOTENCY_KEY_REQUIRED` | ไม่ส่ง header | bug ฝั่ง client |
| 401 | `UNAUTHENTICATED` | ไม่มี/หมดอายุ cookie | ไป `/login` |
| 403 | `FORBIDDEN_ROLE` | role ไม่ใช่ (เช่น ผู้ให้เช่ากด confirm) | toast + กลับหน้าหลัก |
| 403 | `NOT_DEAL_PARTY` | ไม่ใช่คู่ดีล | D6 |
| 404 | `NOT_FOUND` | ไม่พบ | D6 |
| 409 | `DEAL_STATE_CONFLICT` | state ไม่ตรง (เช่น กดปล่อยซ้ำหลังปล่อยแล้วด้วย key ใหม่) | refetch ดีล → redirect ไปหน้าตาม state |
| 409 | `VERSION_MISMATCH` | มีคนแก้ดีลก่อน | refetch แล้วให้กดใหม่ |
| 409 | `IDEMPOTENCY_CONFLICT` | key เดิมแต่ body ต่าง | bug ฝั่ง client |
| 410 | `INVITE_EXPIRED` | คำเชิญ/ดีลหมดอายุ | D6 |
| 422 | `INSUFFICIENT_BALANCE` | ยอดใช้ได้ไม่พอกันเงิน | toast ใน T3 |
| 429 | `RATE_LIMITED` | ดู invite ถี่เกิน | toast |
| 500 | `INTERNAL` | อื่นๆ | toast + requestId |
| 503 | `NOT_READY` | `/readyz` ต่อ DB ไม่ได้ (ใช้กับ health check เท่านั้น) | – |

---

## 2. Endpoint ทั้งหมด

| # | Method & Path | Role | 🔁 | หน้าจอ | หน้าที่ |
|---|---|---|---|---|---|
| 1 | `GET /healthz` | public | | – | process ยังอยู่ |
| 2 | `GET /readyz` | public | | – | ต่อ DB ได้ |
| 3 | `POST /auth/demo-login` | public | | D0 | ล็อกอินด้วย `username` ของบัญชีเดโม |
| 4 | `POST /auth/logout` | any | | D0 | ลบ cookie |
| 5 | `GET /me` | any | | ทุกหน้า | ผู้ใช้ + บัญชีหลัก + จำนวนแจ้งเตือนที่ยังไม่อ่าน |
| 6 | `GET /home` | any | | L1, T1 | ข้อมูลหน้าหลักในครั้งเดียว |
| 7 | `GET /properties` | 🅛 | | L2 | ห้องของฉัน |
| 8 | `POST /deals` | 🅛 | 🔁 | L3 | สร้างดีล → `WAITING_ACCEPT` + ออกคำเชิญ QR |
| 9 | `GET /deals` | any | | D7, D9 | ดีลของฉัน (`?status=active\|closed`) |
| 10 | `GET /deals/{id}` | 🅟 | | L5, D1, D8, T4–T7, L6 | ดีล + ไทม์ไลน์ + ใบเสร็จ |
| 11 | `POST /deals/{id}/invite` | 🅛 | 🔁 | L4 | ออก QR ใหม่ (อันเก่าถูก revoke) |
| 12 | `POST /deals/{id}/invite/send` | 🅛 | 🔁 | L4, D10 | ส่งเข้าแอปผู้เช่า (in-app / เบอร์) |
| 13 | `GET /users/lookup?phone=` | 🅛 | | D10 | หาผู้เช่าจากเบอร์ (คืนแค่ชื่อย่อ) |
| 14 | `GET /invites/{codeOrToken}` | 🅣 | | T2, D12 | ดูรายละเอียดดีลก่อนยอมรับ (rate limit) |
| 15 | `POST /deals/{id}/reject` | 🅣 | 🔁 | T2 | ปฏิเสธ → `REJECTED` |
| 16 | `POST /deals/{id}/lock` | 🅣 | 🔁 | T3 | ยอมรับ + กันเงิน → `FUNDS_LOCKED` |
| 17 | `POST /deals/{id}/confirm-viewing` | 🅣 | 🔁 | T5 | → `BOOKING_FEE_RELEASED` |
| 18 | `POST /deals/{id}/confirm-move-in` | 🅣 | 🔁 | T6 | → `RELEASED` |
| 19 | `POST /deals/{id}/cancel` | 🅟 | 🔁 | D11 | ขอ/ยินยอมยกเลิก |
| 20 | `POST /deals/{id}/report-issue` | 🅣 | 🔁 | D4 | แจ้งห้องไม่ตรง → `hasOpenIssue` |
| 21 | `GET /deals/{id}/calendar.ics` | 🅟 | | L5 | ไฟล์ปฏิทินนัดดูห้อง/วันเข้าอยู่ |
| 22 | `GET /notifications` | any | | D7, badge | รายการแจ้งเตือน |
| 23 | `POST /notifications/read` | any | | D7 | อ่านแล้ว (`ids[]` หรือ `all: true`) |
| 24 | `GET /transfers/payees` | any | | โอนเงิน | ผู้รับที่เลือกได้ (บัญชีเดโมอื่น) |
| 25 | `POST /transfers/precheck` | any | | T8 | ตรวจว่าโอนหาคู่ดีลที่ยังไม่จบไหม |
| 26 | `POST /transfers` | any | 🔁 | T8 | โอนจำลอง / บันทึกว่ายกเลิก |
| 27 | `POST /demo/reset` | any | | Demo tools | รีเซ็ตข้อมูล `?scenario=` (เปิดเมื่อ `DEMO_TOOLS_ENABLED=true`) |
| 28 | `POST /demo/deals/{id}/expire-now` | any | | Demo tools | ตั้ง `expires_at = now()` แล้วรัน expiry ทันที |

---

## 3. DTO หลัก

### `DealDTO` (ตอบจาก #8, #10, และทุก action)

```json
{
  "id": "6f1c…",
  "refNo": "KS-691014-0458",
  "shareCode": "KS-8F4Q21",
  "state": "FUNDS_LOCKED",
  "version": 2,
  "dealType": "RENTAL_DEPOSIT",
  "property": {
    "propertyType": "คอนโด",
    "projectName": "The Park สุขุมวิท 64",
    "unitNo": "A1203",
    "detailLabel": "1 ห้องนอน · 28 ตร.ม. · ชั้น 12",
    "nearbyLabel": "BTS ปุณณวิถี"
  },
  "landlord": {
    "displayName": "สมชาย ใจดี",
    "shortName": "สมชาย ใ.",
    "bankName": "กสิกรไทย",
    "accountNoMasked": "xxx-x-x4821",
    "nameVerified": true
  },
  "tenant": { "displayName": "ณัฐธิดา ศรีสุข", "shortName": "ณัฐธิดา ศ.", "accountNoMasked": "xxx-x-x1432" },
  "amounts": {
    "totalSatang": 650000,
    "bookingFeeSatang": 100000,
    "mainDepositSatang": 550000,
    "feeSatang": 0,
    "releasedSatang": 0,
    "heldSatang": 650000,
    "refundedSatang": 0
  },
  "tranches": [
    { "key": "BOOKING_FEE",  "amountSatang": 100000, "status": "HELD", "releasedAt": null },
    { "key": "MAIN_DEPOSIT", "amountSatang": 550000, "status": "HELD", "releasedAt": null }
  ],
  "viewingAt": "2026-10-18T14:00:00+07:00",
  "moveInDate": "2026-11-01",
  "expiresAt": "2026-11-03T23:59:59+07:00",
  "invite": { "expiresAt": "2026-10-15T10:24:00+07:00", "qrUrl": "https://…/invites/<token>" },
  "cancel": { "landlordRequestedAt": null, "tenantRequestedAt": null },
  "hasOpenIssue": false,
  "myRole": "LANDLORD",
  "nextActor": "TENANT",
  "allowedActions": ["CANCEL"],
  "timeline": [
    { "type": "DEAL_CREATED",  "at": "2026-10-14T10:24:00+07:00", "amountSatang": null },
    { "type": "FUNDS_LOCKED",  "at": "2026-10-14T10:31:00+07:00", "amountSatang": 650000 }
  ],
  "createdAt": "2026-10-14T10:24:00+07:00"
}
```

- `tranches[].status`: `PENDING` (ยังไม่กันเงิน) · `HELD` · `RELEASED` · `REFUNDED`
- `invite.qrUrl` ส่งเฉพาะ landlord และเฉพาะตอนสร้าง/ออกใหม่ (token จริงไม่ถูกเก็บใน DB จึงอ่านซ้ำไม่ได้ — ถ้าหาย ให้เรียก #11 ออกใหม่)
- `nextActor` + `allowedActions` → frontend ใช้ตัดสินใจว่าจะแสดงปุ่มอะไร (ตามสเปก "ทุกหน้าจอควรแสดงว่าใครทำขั้นถัดไป") — แต่ server ยังตรวจซ้ำเสมอ
- `timeline` → L5 แปลงเป็น 4 ขั้นคงที่ (สร้างคำขอ / ผู้เช่ายอมรับและกันเงิน / นัดดูห้อง / เข้าอยู่) โดยดูจาก event ที่เกิดแล้ว

### `MeDTO` (#5)

```json
{
  "user": { "id": "…", "role": "TENANT", "displayName": "ณัฐธิดา ศรีสุข", "shortName": "ณัฐธิดา ศ." },
  "account": { "id": "…", "bankName": "กสิกรไทย", "accountType": "ออมทรัพย์", "accountNoMasked": "xxx-x-x1432",
               "balanceSatang": 2850000, "heldSatang": 650000, "availableSatang": 2200000 },
  "unreadNotifications": 1
}
```

### `HomeDTO` (#6)

```json
{
  "me": { "...": "MeDTO" },
  "pendingInvites": [ { "dealId": "…", "fromShortName": "สมชาย ใ.", "sentAt": "2026-10-14T10:26:00+07:00",
                        "projectName": "The Park สุขุมวิท 64", "unitNo": "A1203",
                        "viewingAt": "2026-10-18T14:00:00+07:00", "totalSatang": 650000, "shareCode": "KS-8F4Q21" } ],
  "activeDeals": [ { "dealId": "…", "state": "FUNDS_LOCKED", "projectName": "…", "unitNo": "A1203", "totalSatang": 650000 } ]
}
```

---

## 4. Request / Response ของ action หลัก

### #3 `POST /auth/demo-login`
```json
// req
{ "username": "tenant" }
// 200 → Set-Cookie: ks_session=…; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200 (SESSION_TTL)
{ "user": { "...": "MeDTO.user" } }
```
- username ที่ไม่มี → `401 UNAUTHENTICATED` · `POST /auth/logout` → `204` + cookie หมดอายุ
- JWT (HS256, `JWT_SECRET`) เก็บแค่ `sub` = user id, `role`, `exp` — middleware ตรวจลายเซ็น/อัลกอริทึม/วันหมดอายุทุก request

### #7 `GET /properties` (🅛)
```json
{ "items": [ { "id": "…", "propertyType": "คอนโด", "projectName": "The Park สุขุมวิท 64", "unitNo": "A1203",
               "detailLabel": "1 ห้องนอน · 28 ตร.ม. · ชั้น 12", "nearbyLabel": "BTS ปุณณวิถี" } ] }
```

### #22 `GET /notifications` · #23 `POST /notifications/read`
```json
// GET → ล่าสุด 50 รายการ
{ "items": [ { "id": "…", "type": "DEAL_INVITE", "dealId": "…", "title": "คำขอ K Sure ใหม่", "body": "จากคุณสมชาย ใ.",
               "readAt": null, "createdAt": "2026-10-14T10:26:00+07:00" } ],
  "unreadCount": 1 }
// POST req: { "ids": ["…"] } หรือ { "all": true } (ไม่ระบุทั้งคู่ → 400) · id ของคนอื่นถูกข้าม
// 200
{ "unreadCount": 0 }
```

### #27 `POST /demo/reset?scenario=`
```json
// scenario: fresh (ค่าเริ่มต้น) | waiting_accept | funds_locked | booking_released | released
// 200
{ "scenario": "funds_locked", "dealId": "…" }   // fresh → dealId: null
```
- ต้องล็อกอิน (role ไหนก็ได้) · ลงทะเบียน route เฉพาะเมื่อ `DEMO_TOOLS_ENABLED=true` (ไม่งั้น 404)
- scenario ไม่รู้จัก → `400 VALIDATION_FAILED`

### #8 `POST /deals` (L3 "สร้างคำขอ K Sure")
```json
// req  (Idempotency-Key: …)
{
  "propertyId": "…",
  "totalSatang": 650000,
  "bookingFeeSatang": 100000,
  "viewingAt": "2026-10-18T14:00:00+07:00",
  "moveInDate": "2026-11-01"
}
// 201 → DealDTO (state WAITING_ACCEPT, มี invite.qrUrl)
```
- server คำนวณ `mainDepositSatang = total − booking`, `expiresAt = moveInDate + 2 วัน 23:59:59 (+07)`, `ref_no`, `share_code`, invite (24 ชม.)
- validation: `0 < booking < total`, `viewingAt > now`, `moveInDate ≥ viewingAt (วันไทย)`, ห้องต้องเป็นของผู้ให้เช่าคนนี้ · `total ≤ 100,000,000` สตางค์
- `invite.qrUrl` = `<APP_BASE_URL>/invites/<token>`

### ลำดับการตรวจของทุก action (หลัง `SELECT … FOR UPDATE`)
1. เป็นคู่ดีลไหม → `403 NOT_DEAL_PARTY` (role ผิดถูกกันตั้งแต่ route → `403 FORBIDDEN_ROLE`)
2. state + action + role อยู่ในตาราง transition ไหม → `409 DEAL_STATE_CONFLICT`
3. `version` ตรงไหม → `409 VERSION_MISMATCH`
4. ดีลยังไม่หมดอายุ → `410 INVITE_EXPIRED`

state ตรวจก่อน version เพื่อให้ "กดปล่อยซ้ำหลังปล่อยแล้ว (key ใหม่)" ได้ `DEAL_STATE_CONFLICT` · คำตอบที่ส่งซ้ำจาก Idempotency-Key เดิมมี header `Idempotent-Replayed: true`

> คำตอบที่บันทึกไว้สำหรับ Idempotency-Key **ตัด `invite.qrUrl` ออก** (token จริงห้ามอยู่ใน DB) — สร้างดีล/ออก QR ซ้ำด้วย key เดิมจึงไม่ได้ `qrUrl` ให้เรียก #11 ออกใหม่ · log ของ API บันทึก path แบบ pattern (`/invites/:code`) ไม่ใช่รหัสจริง

### #9 `GET /deals?status=active|closed`
```json
{ "items": [ { "id": "…", "refNo": "KS-691014-0458", "state": "RELEASED", "projectName": "The Park สุขุมวิท 64",
               "unitNo": "A1203", "totalSatang": 650000, "myRole": "LANDLORD", "createdAt": "…" } ] }
```

### #13 `GET /users/lookup?phone=0890001432`
`{ "shortName": "ณัฐธิดา ศ." }` · ไม่ใช่ผู้เช่า/ไม่พบ → `404`

### #12 `POST /deals/{id}/invite/send` (L4 "ส่งเข้าแอปผู้เช่า")
```json
// req
{ "channel": "IN_APP" }                       // ส่งให้ผู้เช่าเดโม (default)
{ "channel": "PHONE", "phone": "0890001432" }  // D10
// 200
{ "sentTo": { "shortName": "ณัฐธิดา ศ." }, "sentAt": "2026-10-14T10:26:00+07:00" }
```
→ สร้าง `notifications` (`DEAL_INVITE`) ให้ผู้เช่า + `deal_events.INVITE_SENT`

### #14 `GET /invites/{codeOrToken}` (T2)
- รับได้ทั้ง `KS-8F4Q21` (พิมพ์/สแกน) และ token จาก QR
- ตอบ `DealDTO` แบบจำกัด (ไม่มี `invite.qrUrl`, ไม่มีข้อมูลผู้เช่า) + `myRole: "TENANT"`
- หมดอายุ → `410 INVITE_EXPIRED` · state ไม่ใช่ `WAITING_ACCEPT` และฉันไม่ใช่ผู้เช่าของดีลนี้ → `404`

### #16 `POST /deals/{id}/lock` (T3)
```json
// req (Idempotency-Key)
{ "version": 1, "inviteCode": "KS-8F4Q21", "method": "FACE_ID" }   // method: FACE_ID | PIN — เก็บเป็น metadata เท่านั้น ไม่มีค่า PIN
// 200 → DealDTO (state FUNDS_LOCKED) + "account": { availableSatang: 2200000, heldSatang: 650000 }
```

### #17 `POST /deals/{id}/confirm-viewing` (T5)
```json
// req (Idempotency-Key)
{ "version": 2, "checklist": ["VIEWED_ROOM", "ROOM_MATCHES", "LANDLORD_MATCHES"] }
// 200 → DealDTO (state BOOKING_FEE_RELEASED)
```
server ตรวจว่า checklist ครบ 3 ข้อ (กันการยิง API ข้าม UI)

### #18 `POST /deals/{id}/confirm-move-in` (T6)
```json
{ "version": 3, "checklist": ["GOT_KEYS", "ROOM_USABLE", "CONTRACT_SIGNED"] }
// 200 → DealDTO (state RELEASED)
```

### #19 `POST /deals/{id}/cancel` (D11)
```json
{ "version": 2, "reason": "ไม่สะดวกเข้าอยู่" }
// 200 → DealDTO
//   ฝ่ายแรก: state เดิม, cancel.xxxRequestedAt มีค่า, nextActor = อีกฝ่าย
//   ฝ่ายที่สอง: state REFUNDED
```

### #25 `POST /transfers/precheck` (T8)
```json
// req
{ "toAccountId": "…", "amountSatang": 300000 }
// 200 (ปกติ)
{ "warning": null }
// 200 (เด้ง T8)
{
  "warning": {
    "code": "OFF_DEAL_PAYMENT",
    "dealId": "…",
    "unitNo": "A1203",
    "message": "บัญชีนี้เป็นคู่ดีล K Sure ของคุณ (ห้อง A1203) ที่ยังไม่จบ"
  }
}
```

### #26 `POST /transfers`
```json
{ "toAccountId": "…", "amountSatang": 300000, "memo": "ค่าส่วนกลางล่วงหน้า",
  "action": "CANCEL" }               // CANCEL = กด "ยกเลิกการโอน" | CONFIRM = "ฉันเข้าใจความเสี่ยง…"
// 201 { "id": "…", "status": "CANCELLED_BY_USER", "warningShown": true }
```
→ ถ้า `CONFIRM`: ย้ายยอดระหว่าง demo_accounts (จำลอง) · ทั้งสองแบบบันทึก `warning_shown` เพื่อเอาไปเล่าในพิตช์ ("กี่ % ของผู้ใช้ยกเลิกหลังเห็นคำเตือน")

---

## 5. Polling / Real-time

| หน้า | Query | `refetchInterval` | หยุดเมื่อ |
|---|---|---|---|
| L5 / D1 / D8 | `GET /deals/{id}` | 3000ms | state จบ (`RELEASED`, `REJECTED`, `EXPIRED`, `REFUNDED`) |
| L1 / T1 | `GET /home` | 5000ms | ออกจากหน้า |
| badge แจ้งเตือน | `GET /me` | 10000ms | – |

เมื่อ `state` หรือ `version` เปลี่ยน → frontend เล่นอนิเมชัน §5.4 ของ [02-ui-spec](./02-ui-spec.md) · ถ้า landlord อยู่ L5 แล้ว state = `RELEASED` → ไป L6 อัตโนมัติ

> อัปเกรดภายหลัง (ถ้ามีเวลา): `GET /deals/{id}/stream` แบบ Server-Sent Events แทน polling

---

## 6. Middleware chain (Fiber)

```text
recover → requestid → logger(JSON, ไม่ log query string/token) → (auth: อ่าน cookie → ctx.user)
        → (role guard ต่อ route) → (idempotency: เฉพาะ route 🔁) → handler
```

Idempotency middleware: อ่าน `(user_id, key)` → ถ้ามี + hash เท่ากัน → คืน response เดิม · ถ้าไม่มี → ให้ service เขียน record **ใน transaction เดียวกับ action** (service รับ key เข้าไป) เพื่อไม่ให้มีกรณี action สำเร็จแต่ record ไม่ถูกบันทึก
