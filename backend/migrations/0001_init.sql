-- Schema ตั้งต้น — ต้นฉบับอยู่ที่ docs/04-database.md §3 (แก้ที่เอกสารก่อน แล้วค่อยทำ migration ใหม่ ห้ามแก้ไฟล์นี้หลัง merge)

-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

CREATE TYPE user_role         AS ENUM ('LANDLORD','TENANT');
CREATE TYPE deal_state        AS ENUM ('DRAFT','WAITING_ACCEPT','REJECTED','FUNDS_LOCKED','VIEWING_CONFIRMED',
                                       'BOOKING_FEE_RELEASED','MOVE_IN_CONFIRMED','RELEASED','EXPIRED','CANCELLED','REFUNDED');
CREATE TYPE deal_event_type   AS ENUM ('DEAL_CREATED','INVITE_SENT','DEAL_ACCEPTED','DEAL_REJECTED','FUNDS_LOCKED',
                                       'VIEWING_CONFIRMED','BOOKING_FEE_RELEASED','MOVE_IN_CONFIRMED','MAIN_DEPOSIT_RELEASED',
                                       'CANCEL_REQUESTED','DEAL_CANCELLED','DEAL_EXPIRED','FUNDS_REFUNDED','ISSUE_REPORTED');
CREATE TYPE ledger_event_type AS ENUM ('HOLD','RELEASE_BOOKING_FEE','RELEASE_MAIN_DEPOSIT','REFUND');
CREATE TYPE invite_channel    AS ENUM ('QR','IN_APP','PHONE');
CREATE TYPE notification_type AS ENUM ('DEAL_INVITE','FUNDS_LOCKED','BOOKING_FEE_RELEASED','MAIN_DEPOSIT_RELEASED',
                                       'DEAL_REJECTED','CANCEL_REQUESTED','DEAL_REFUNDED','DEAL_EXPIRED');
CREATE TYPE transfer_status   AS ENUM ('COMPLETED_SIMULATED','CANCELLED_BY_USER');

-- ผู้ใช้เดโม (ไม่มี KYC จริง)
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,              -- 'landlord', 'tenant' (ใช้ตอน demo login)
  role          user_role NOT NULL,
  display_name  text NOT NULL,                     -- 'สมชาย ใจดี'
  short_name    text NOT NULL,                     -- 'สมชาย ใ.'
  phone         text UNIQUE,                       -- เบอร์สมมติ ใช้ค้นในแท็บ "เบอร์มือถือผู้เช่า"
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- บัญชีธนาคารจำลอง (ไม่เก็บเลขบัญชีเต็ม)
CREATE TABLE demo_accounts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id),
  bank_name          text NOT NULL,                -- 'กสิกรไทย'
  account_type       text NOT NULL,                -- 'ออมทรัพย์'
  account_no_masked  text NOT NULL,                -- 'xxx-x-x4821'
  balance_satang     bigint NOT NULL CHECK (balance_satang >= 0),
  held_satang        bigint NOT NULL DEFAULT 0 CHECK (held_satang >= 0 AND held_satang <= balance_satang),
  is_primary         boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX demo_accounts_one_primary ON demo_accounts(user_id) WHERE is_primary;

-- ห้อง (ไม่มีรูป ตาม UI v3)
CREATE TABLE properties (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id    uuid NOT NULL REFERENCES users(id),
  property_type  text NOT NULL DEFAULT 'คอนโด',
  project_name   text NOT NULL,                    -- 'The Park สุขุมวิท 64'
  unit_no        text NOT NULL,                    -- 'A1203'
  detail_label   text NOT NULL,                    -- '1 ห้องนอน · 28 ตร.ม. · ชั้น 12'
  nearby_label   text,                             -- 'BTS ปุณณวิถี'
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (landlord_id, project_name, unit_no)
);

CREATE TABLE deals (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no                      text NOT NULL UNIQUE,      -- 'KS-691014-0458'
  share_code                  text NOT NULL UNIQUE,      -- 'KS-8F4Q21'
  landlord_id                 uuid NOT NULL REFERENCES users(id),
  landlord_account_id         uuid NOT NULL REFERENCES demo_accounts(id),
  tenant_id                   uuid REFERENCES users(id), -- NULL จนกว่าผู้เช่าจะ lock (หรือถูกระบุตอนส่งเข้าแอป)
  tenant_account_id           uuid REFERENCES demo_accounts(id),
  property_id                 uuid NOT NULL REFERENCES properties(id),
  deal_type                   text NOT NULL DEFAULT 'RENTAL_DEPOSIT',
  currency                    char(3) NOT NULL DEFAULT 'THB',
  total_satang                bigint NOT NULL,
  booking_fee_satang          bigint NOT NULL CHECK (booking_fee_satang > 0),
  main_deposit_satang         bigint NOT NULL CHECK (main_deposit_satang > 0),
  fee_satang                  bigint NOT NULL DEFAULT 0 CHECK (fee_satang >= 0),
  viewing_at                  timestamptz NOT NULL,
  move_in_date                date NOT NULL,
  expires_at                  timestamptz NOT NULL,     -- '2026-11-03 23:59:59+07'
  state                       deal_state NOT NULL,
  version                     integer NOT NULL DEFAULT 1,
  landlord_cancel_requested_at timestamptz,
  tenant_cancel_requested_at   timestamptz,
  has_open_issue              boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CHECK (total_satang = booking_fee_satang + main_deposit_satang),
  CHECK (tenant_id IS NULL OR tenant_id <> landlord_id),
  CHECK (move_in_date >= (viewing_at AT TIME ZONE 'Asia/Bangkok')::date),
  CHECK (expires_at > viewing_at)
);
CREATE INDEX deals_landlord_idx ON deals(landlord_id, created_at DESC);
CREATE INDEX deals_tenant_idx   ON deals(tenant_id, created_at DESC);
CREATE INDEX deals_expiry_idx   ON deals(expires_at) WHERE state IN ('WAITING_ACCEPT','FUNDS_LOCKED','BOOKING_FEE_RELEASED');

-- คำเชิญ: เก็บเฉพาะ hash ของ token (ห้ามเก็บ token จริง)
CREATE TABLE deal_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         uuid NOT NULL REFERENCES deals(id),
  token_hash      bytea NOT NULL UNIQUE,            -- sha256(token)
  channel         invite_channel NOT NULL,
  target_user_id  uuid REFERENCES users(id),        -- ระบุเมื่อส่งเข้าแอป/เบอร์
  expires_at      timestamptz NOT NULL,             -- created + 24h → L4 "ใช้ได้ถึง 15 ต.ค. 2569 · 10:24"
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deal_invites_deal_idx ON deal_invites(deal_id);

-- ไทม์ไลน์ (ทุก action ที่ผู้ใช้เห็น)
CREATE TABLE deal_events (
  id             bigserial PRIMARY KEY,
  deal_id        uuid NOT NULL REFERENCES deals(id),
  event_type     deal_event_type NOT NULL,
  actor_id       uuid REFERENCES users(id),         -- NULL = SYSTEM (expiry worker)
  from_state     deal_state,
  to_state       deal_state,
  amount_satang  bigint,
  request_id     text,
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deal_events_deal_idx ON deal_events(deal_id, id);

-- Ledger จำลอง: append-only
CREATE TABLE ledger_events (
  id               bigserial PRIMARY KEY,
  deal_id          uuid NOT NULL REFERENCES deals(id),
  event_type       ledger_event_type NOT NULL,
  amount_satang    bigint NOT NULL CHECK (amount_satang > 0),
  from_account_id  uuid REFERENCES demo_accounts(id),
  to_account_id    uuid REFERENCES demo_accounts(id),
  actor_id         uuid REFERENCES users(id),
  idempotency_key  text NOT NULL,
  metadata         jsonb NOT NULL DEFAULT '{"simulated": true}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, idempotency_key),
  UNIQUE (deal_id, event_type)          -- 🔒 ด่านสุดท้าย: แต่ละประเภทเกิดได้ครั้งเดียวต่อดีล → ปล่อยเงินซ้ำไม่ได้แน่นอน
);

-- กัน UPDATE/DELETE ledger (append-only)
-- +goose StatementBegin
CREATE FUNCTION forbid_ledger_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'ledger_events is append-only'; END; $$ LANGUAGE plpgsql;
-- +goose StatementEnd
CREATE TRIGGER ledger_events_no_update BEFORE UPDATE OR DELETE ON ledger_events
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  type        notification_type NOT NULL,
  deal_id     uuid REFERENCES deals(id),
  title       text NOT NULL,                 -- 'คำขอ K Sure ใหม่'
  body        text NOT NULL,                 -- 'จากคุณสมชาย ใ.'
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_unread_idx ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- การโอนจำลอง (สำหรับเดโม T8)
CREATE TABLE transfers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id   uuid NOT NULL REFERENCES demo_accounts(id),
  to_account_id     uuid NOT NULL REFERENCES demo_accounts(id),
  amount_satang     bigint NOT NULL CHECK (amount_satang > 0),
  memo              text,                     -- 'ค่าส่วนกลางล่วงหน้า'
  status            transfer_status NOT NULL,
  warning_shown     boolean NOT NULL DEFAULT false,
  related_deal_id   uuid REFERENCES deals(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Idempotency
CREATE TABLE idempotency_keys (
  user_id        uuid NOT NULL REFERENCES users(id),
  key            text NOT NULL,
  method_path    text NOT NULL,              -- 'POST /api/v1/deals/{id}/confirm-viewing'
  request_hash   text NOT NULL,              -- sha256(body) → ถ้า key เดิมแต่ body ต่าง = IDEMPOTENCY_CONFLICT
  status_code    integer NOT NULL,
  response_body  jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- เลขอ้างอิงรายวัน KS-YYMMDD-NNNN (YY = พ.ศ. 2 หลัก)
CREATE TABLE ref_counters (
  day       date PRIMARY KEY,
  last_seq  integer NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS ref_counters, idempotency_keys, transfers, notifications, ledger_events,
  deal_events, deal_invites, deals, properties, demo_accounts, users CASCADE;
DROP FUNCTION IF EXISTS forbid_ledger_mutation();
DROP TYPE IF EXISTS transfer_status, notification_type, invite_channel, ledger_event_type,
  deal_event_type, deal_state, user_role;
