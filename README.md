# K Sure

> ระบบต้นแบบสำหรับลดความเสี่ยงการหลอกลวงระหว่างจองเช่าที่พัก ยอดเงิน บัญชี และการยืนยันตัวตนทั้งหมดเป็นข้อมูลจำลอง

![K Sure](assets/brand/ksure-logo-300w.png)

## ภาพรวม

K Sure เปลี่ยนการโอนเงินมัดจำล่วงหน้าเป็นการกันเงินไว้ในบัญชีของผู้เช่า ผู้ให้เช่าเห็นสถานะการกันเงิน แต่เงินจะถูกปล่อยเมื่อผู้เช่ายืนยันว่าดูห้องและเข้าอยู่แล้ว

- ผู้เช่ายังเป็นผู้ควบคุมการปล่อยเงิน
- เงินที่ยังไม่ปล่อยคืนผู้เช่าเมื่อดีลหมดอายุ
- ระบบเตือนก่อนโอนเงินให้คู่ดีลนอกกระบวนการ
- ทุกการเปลี่ยนสถานะและรายการเงินทำผ่าน API และ ledger จำลอง

## หน้าจอ

| ผู้ให้เช่า | ผู้เช่า |
| --- | --- |
| L1 หน้าหลัก · L2 สร้างดีล · L3 ตรวจสอบ · L4 ส่งคำขอ · L5 สถานะ · L6 สำเร็จ | T1 หน้าหลัก · T2 ตรวจสอบ · T3 ยืนยันตัวตนจำลอง · T4 กันเงิน · T5 ยืนยันดูห้อง · T6 ยืนยันเข้าอยู่ · T7 สำเร็จ · T8 เตือนโอนนอกดีล |

![Landlord flow](docs/design/flow-landlord.png)

![Tenant flow](docs/design/flow-tenant.png)

ภาพอ้างอิงจาก Figma อยู่ที่ [docs/design](docs/design/README.md)

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
| --- | --- |
| Frontend | Next.js 16, TypeScript, Tailwind CSS, TanStack Query, Playwright |
| Backend | Go, Fiber, pgx, sqlc, goose |
| Database | PostgreSQL 18 via Docker Compose |

## เริ่มต้นใช้งาน

### สิ่งที่ต้องมี

- Node.js 24+
- Go 1.27+
- Docker Desktop

### รันระบบทั้งหมด

```bash
git clone https://github.com/suphanatchanlek30/KBTG-Kampus-Hackathon-2026-Intern-Edition.git
cd KBTG-Kampus-Hackathon-2026-Intern-Edition

cp .env.example .env
cp frontend/.env.local.example frontend/.env.local

make up

cd frontend
npm install
npm run dev
```

เปิดแอปที่ `http://localhost:3000` และตรวจ API ที่ `http://localhost:8080/api/v1/readyz`

### โหมดข้อมูล

กำหนดใน `frontend/.env.local`

```env
# โหมด UI อย่างเดียว ไม่ต้องใช้ backend
NEXT_PUBLIC_USE_MOCK=true

# โหมด API ร่วม รัน `make up` ก่อน
# NEXT_PUBLIC_USE_MOCK=false
```

สำหรับเดโมสองเครื่อง ให้ใช้ API mode และเลือกบัญชีคนละ role ที่ `/login`

### สแกน QR บนมือถือ

หน้า `/scan` เปิดจากปุ่มกลางของหน้า Home ได้ กล้องของเบราว์เซอร์ต้องใช้ HTTPS หรือ `localhost`; ใช้ `npm run dev -- --experimental-https` หรือ tunnel สำหรับอุปกรณ์จริง

## คำสั่งตรวจสอบ

```bash
# Frontend
cd frontend
npm test
npm run lint
npm run typecheck
npm run format:check
npm run test:visual

# ต้องรัน `make up` และเปิด frontend ใน API mode
npm run test:e2e

# Backend integration tests
cd ..
make test
```

`npm run test:visual` ตรวจ 14 หน้าจอที่ 393×852 กับ Figma overlay. ใช้ `npm run test:visual:update` เฉพาะหลังตรวจ baseline ใหม่ด้วยตาแล้ว

## โครงสร้างโปรเจกต์

```text
frontend/   Next.js application and Playwright tests
backend/    Go API, migrations, and integration tests
docs/       Product, UI, architecture, database, and API documentation
assets/     Source design assets
```

## เอกสาร

| เอกสาร | เนื้อหา |
| --- | --- |
| [การทำงานของผลิตภัณฑ์](docs/01-user-flow.md) | บทบาท สถานะ และเส้นทางผู้ใช้ |
| [คู่มือ UI](docs/02-ui-spec.md) | ระบบออกแบบและการแสดงผลบนหลายขนาดจอ |
| [สถาปัตยกรรม](docs/03-architecture.md) | ส่วนประกอบระบบและการพัฒนาในเครื่อง |
| [โมเดลข้อมูล](docs/04-database.md) | สถานะ ledger และกติกาของ transaction |
| [API](docs/05-api.md) | HTTP contract และการจัดการ error |
| [สถานะงาน](docs/06-roadmap.md) | สิ่งที่เสร็จและงานถัดไป |
| [Assets](docs/07-assets.md) | ที่มาและวิธีใช้งาน asset |
| [Deploy บน EC2](infra/README.md) | Terraform, domain, Vercel และการเปิดปิดเครื่อง |

## ข้อจำกัดของต้นแบบ

- ไม่มีเงินจริง การเชื่อมธนาคารจริง หรือการยืนยันตัวตนจริง
- Face ID และ PIN เป็น UI simulation เท่านั้น
- ชื่อและภาพลักษณ์ต้องได้รับอนุมัติก่อนใช้ในงานสาธารณะ
- ชุด deploy บน EC2 เหมาะกับ demo ระยะสั้น ต้องสำรองฐานข้อมูลเอง

## สิทธิ์การใช้งาน

โปรเจกต์นี้เป็นต้นแบบสำหรับ hackathon ภายใน ห้ามใช้ทำธุรกรรมทางการเงินจริง
