# K Sure — Frontend

Next.js (App Router) · TypeScript · Tailwind CSS v4 — ดูภาพรวมที่ [README หลัก](../README.md) และสเปกที่ [docs/](../docs/)

```bash
cp .env.local.example .env.local
npm install
npm run dev          # http://localhost:3000 (เปิดจากมือถือในวง LAN ได้ที่ http://<IP เครื่อง>:3000)
```

| คำสั่ง                            | ทำอะไร                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`                     | dev server (copy รูป mockup ไป `public/dev/screens` ให้ก่อนอัตโนมัติ)            |
| `npm run build`                   | production build — ต้องผ่านก่อน merge (error ของ Cache Components โผล่ตอน build) |
| `npm test`                        | Vitest (format เงิน/วันที่/บัญชี, `cn`)                                          |
| `npm run typecheck`               | `next typegen` + `tsc`                                                           |
| `npm run lint` / `npm run format` | ESLint / Prettier (+ เรียงคลาส Tailwind)                                         |

## หน้าสำหรับนักพัฒนา (เฉพาะ dev — production ตอบ 404)

- `/dev/components` — ทุก component ทุก variant, สี, typography
- `/dev/overlay?screen=L1&opacity=0.5` — วาง mockup 2x ทับหน้าจริงในกรอบ 393×852 · คีย์ลัด `O` ซ่อน/แสดง · `[` `]` ปรับ opacity · `D` โหมด difference · เพิ่มหน้าจอที่ `src/app/dev/overlay/screens.tsx`

## Mock data (Phase 2)

`NEXT_PUBLIC_USE_MOCK=true` (ค่าเริ่มต้น) → ทุกหน้าใช้ `src/mocks/handlers.ts` ที่ขยับ state ของดีลได้จริงในหน่วยความจำ (เก็บใน `sessionStorage`)

- **สลับ role / รีเซ็ตดีล:** desktop ใช้แผง _Demo tools_ ข้างกรอบโทรศัพท์ · มือถือเปิด `/home?as=tenant` หรือ `/home?as=landlord`
- **flow ผู้ให้เช่า:** `/home` → สร้างดีลเลย → L2 → L3 → L4 → ส่งเข้าแอปผู้เช่า → L5 (D1)
- **flow ผู้เช่า:** `/home?as=tenant` → ตรวจสอบคำขอ → T2 → T3 (Face ID จำลอง) → T4 → D8 → T5 → T6 → T7 · T8 ที่ `/transfer` ระหว่างดีลยังไม่จบ
- หน้าจอทุกหน้าแยกเป็น `*View` (รับ props ล้วน — ใช้ใน `/dev/overlay`) กับ `*Screen` (ดึงข้อมูล/เรียก mutation)

## ข้อควรรู้

- แก้ token ใน `@theme` (`globals.css`) แล้วคลาสใหม่ไม่ขึ้น → restart `npm run dev` (Turbopack cache CSS ของ Tailwind ไว้)
- ลายพื้นหลังแต่ละหน้าสร้างจาก Figma: `node scripts/gen-backgrounds.mjs && npx prettier --write src/components/layout/backgrounds.generated.ts`

## กติกา

- สีใช้ token จาก `src/app/globals.css` เท่านั้น (ห้าม hex ใน component) · รวมคลาสด้วย `cn()` จาก `@/lib/cn`
- เงินเป็นสตางค์ (integer) ทุกที่ → แสดงผลด้วย `formatBaht` · วันที่ใช้ฟังก์ชันใน `@/lib/format/date` (พ.ศ., Asia/Bangkok)
- ข้อความแบรนด์อยู่ที่ `src/config/brand.ts` ที่เดียว
- `framed:` variant = แสดงเฉพาะในกรอบโทรศัพท์ (desktop หรือ `/dev/overlay`) เช่น status bar 9:41
