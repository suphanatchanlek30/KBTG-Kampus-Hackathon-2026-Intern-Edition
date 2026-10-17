
-- +goose Up
INSERT INTO users (id, username, role, display_name, short_name, phone) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'landlord', 'LANDLORD', 'สมชาย ใจดี',     'สมชาย ใ.',   '0810004821'),
  ('00000000-0000-0000-0000-00000000b001', 'tenant',   'TENANT',   'ณัฐธิดา ศรีสุข', 'ณัฐธิดา ศ.', '0890001432');

INSERT INTO demo_accounts (id, user_id, bank_name, account_type, account_no_masked, balance_satang) VALUES
  ('00000000-0000-0000-0000-0000000aa001', '00000000-0000-0000-0000-00000000a001', 'กสิกรไทย', 'ออมทรัพย์', 'xxx-x-x4821', 4285000),
  ('00000000-0000-0000-0000-0000000bb001', '00000000-0000-0000-0000-00000000b001', 'กสิกรไทย', 'ออมทรัพย์', 'xxx-x-x1432', 2850000);

INSERT INTO properties (landlord_id, property_type, project_name, unit_no, detail_label, nearby_label) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'คอนโด', 'The Park สุขุมวิท 64', 'A1203',
   '1 ห้องนอน · 28 ตร.ม. · ชั้น 12', 'BTS ปุณณวิถี');

-- +goose Down
TRUNCATE ledger_events, deal_events, deal_invites, notifications, transfers, idempotency_keys, deals,
  ref_counters, properties, demo_accounts, users RESTART IDENTITY CASCADE;
