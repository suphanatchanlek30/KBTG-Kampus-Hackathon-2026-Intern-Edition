# docs/design/compare — เทียบหน้าจริงกับ mockup (Phase 2)

แต่ละภาพมี 3 ช่อง: **หน้าจริง** | **mockup** (`docs/design/screens/`) | **ซ้อนกัน 50%**
ถ่ายจาก `/dev/overlay?screen=<ID>&controls=0` ที่ 393×852 (16 ต.ค. 2569)

| ผู้ให้เช่า | ผู้เช่า |
|---|---|
| [L1](./L1.jpg) · [L2](./L2.jpg) · [L3](./L3.jpg) · [L4](./L4.jpg) · [L5](./L5.jpg) · [L6](./L6.jpg) | [T1](./T1.jpg) · [T2](./T2.jpg) · [T3](./T3.jpg) · [T4](./T4.jpg) · [T5](./T5.jpg) · [T6](./T6.jpg) · [T7](./T7.jpg) · [T8](./T8.jpg) |

## จุดที่ต่างจาก mockup โดยตั้งใจ

| จุด | เหตุผล |
|---|---|
| ยอดเงินที่เคยมี `฿` นำหน้า (เช่น 42,850.00 · 6,500.00 · ปุ่ม "ยอมรับและกันเงิน 6,500") | ใน mockup ตัวเลขเยื้องไป ~24–32px เพราะ Figma เว้นที่ให้ `฿` (ฟอนต์ Arimo) ไว้แต่ไม่แสดง — ตัดสินแล้วว่า **ไม่แสดง ฿ และไม่เว้นช่อง** (docs/02-ui-spec.md §1.2) |
| ลาย QR ใน L4 | เป็น QR จริงที่เข้ารหัสลิงก์คำเชิญ ลายจึงต่างจากภาพตัวอย่าง |
| T8 sheet ในภาพดูจางเล็กน้อย | ถ่ายด้วยโหมด reduced motion ระหว่าง fade-in 0.15s — บนเครื่องจริงแสดงเต็ม |
| ข้อความที่ต่างกัน ≤ 3px ในแนวตั้ง | Figma ปัดความสูงกล่องข้อความ (เช่น 17.4 → 18) |

## ถ่ายใหม่

```bash
cd frontend && npm run dev
# เปิด http://localhost:3000/dev/overlay?screen=L1 แล้วกด O (ซ่อน/แสดง) · [ ] (opacity) · D (difference)
```

## ตรวจอัตโนมัติ

```bash
cd frontend
npm run test:visual
```

คำสั่งนี้เปิด mock server เอง แล้วเปรียบภาพ composite ที่ 393×852 กับ baseline ของ Figma overlay ครบ L1–L6 และ T1–T8. ถ้าตั้งใจเปลี่ยนหน้าจอ ให้ตรวจภาพก่อน แล้วอัปเดต baseline ด้วย `npm run test:visual:update`.
