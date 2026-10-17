# 07 · Assets Checklist (สิ่งที่ต้องหามาใส่)

> วางไฟล์ไว้ในโฟลเดอร์ [`/assets`](../assets/) ตามตารางนี้ (เป็นต้นฉบับ) · ตอน Phase 1 จะ copy ไปไว้ที่ `frontend/public/`
> 🔴 = ต้องมีก่อนเริ่ม Phase 2 · 🟡 = ควรมี (ไม่มีก็ทำแทนด้วยโค้ดได้ แต่จะเป๊ะน้อยลง) · ⚪ = มีก็ดี

## 1. สำคัญที่สุด (ช่วยให้ "เป๊ะ" ได้จริง)

| | สิ่งที่ขอ | ทำไม |
|---|---|---|
| ✅ | **ลิงก์ไฟล์ Figma** — [UI-KBTG](https://www.figma.com/design/KLFeKqPDsAOhGLcbfrjT7N/UI-KBTG?node-id=29-2) เฟรม **K Sure UI v3-final** (node `29:2`) | ดึงแล้วผ่าน REST API → ค่าละเอียดอยู่ที่ [`design/figma-spec/`](./design/figma-spec/) และภาพ 2x ที่ [`design/screens/`](./design/screens/) |
| 🟡 | โฟลเดอร์ **`prototype/ksure-ui-v3/`** (รวม `FLOW.md`) ที่สเปกอ้างถึง | ถ้าเป็น HTML prototype จะได้ค่า CSS / ข้อความ / flow ที่ทีมตกลงกันไว้แล้ว |
| ✅ | รูป mockup ความละเอียดสูง (export 2x ต่อหน้าจอ) | ได้แล้วจาก Figma v3-final → `docs/design/screens/` |

## 2. แบรนด์ → `assets/brand/`

| | ไฟล์ | รายละเอียด | ใช้ที่ |
|---|---|---|---|
| ✅ | `ksure-logo.png` (841×258) | ได้จาก Figma แล้ว (ต้นฉบับใน Figma เป็นรูป PNG ไม่ใช่ vector — ใช้ได้ถึงขนาดแสดงผล ~280px ที่ 3x) · SVG ⚪ มีก็ดี | T4 หัวหน้า, L6/T7 การ์ดหลักฐาน, L1 แบนเนอร์, D0 |
| ✅ | `ksure-mark.png` (268×258) | ได้จาก Figma แล้ว · ตัว K อย่างเดียว (พื้นโปร่ง) | HomeHeader L1/T1, กลาง QR (L4), ช่องบริการ K Sure, การ์ดคำขอ T1 |
| 🟡 | `ksure-mark-on-white.svg` | ตัว K บนพื้นขาว (ตาม foundations "Logo mark · on white") | app icon, favicon |
| ⚪ | `ksure-logo-mono.svg` | แบบสีเดียว (ขาว/ดำ) | ภาพใบเสร็จขาวดำ, พิมพ์ |

## 3. App icons → `assets/app-icons/`

| | ไฟล์ | ขนาด |
|---|---|---|
| ✅ | `icon-192.png`, `icon-512.png` | PWA manifest — สร้างจาก `ksure-mark.png` ที่ `frontend/public/app-icons/` |
| ✅ | `icon-maskable-512.png` | Android — สร้างจาก `ksure-mark.png` ที่ `frontend/public/app-icons/` |
| ✅ | `apple-touch-icon.png` | 180×180 — สร้างจาก `ksure-mark.png` ที่ `frontend/public/app-icons/` |
| 🟡 | `favicon.ico` หรือ `icon.svg` | browser tab |

> ถ้าให้แค่ `ksure-mark-on-white.svg` มา — ผมสร้างไอคอนทุกขนาดให้ได้

## 4. Illustration → `assets/illustrations/`

| | ไฟล์ | รายละเอียด | ใช้ที่ |
|---|---|---|---|
| 🟡 | `shield-house-baht.svg` | วงกลมขาว + โล่ดำ + บ้านเขียว + เหรียญ ฿ เขียวมุมขวาบน | แบนเนอร์ L1 |
| ⚪ | `sparkle.svg` | ประกาย ✦ 4 แฉก | หน้า success (ทำด้วยโค้ดได้) |

> ไม่มีก็ได้ — จะประกอบด้วย SVG + ไอคอน lucide ให้ใกล้เคียงที่สุด

## 5. พื้นหลัง → `assets/backgrounds/`

| | ไฟล์ | รายละเอียด |
|---|---|---|
| 🟡 | `bg-curves.svg` | เส้นโค้งบางๆ มุมขวาบนที่เห็นในทุกหน้า (export จาก Figma แบบ SVG) |
| 🟡 | `bg-glow.svg` หรือค่า gradient | แสงเขียวด้านล่างหลังปุ่มหลัก / แสงบนหน้า success |
| ⚪ | `balance-card-waves.svg` | ลายเส้นคลื่นจางๆ บนการ์ดยอดเงินสีมิ้นต์ |

## 6. ฟอนต์ → `assets/fonts/`

| | ฟอนต์ | หมายเหตุ |
|---|---|---|
| — | Poppins, Noto Sans Thai | **ไม่ต้องหา** — โหลดผ่าน `next/font/google` อัตโนมัติ |
| ⚪ | ฟอนต์อื่น | ถ้า Figma ใช้ฟอนต์อื่น (เช่น LINE Seed Sans TH / IBM Plex Sans Thai) ให้บอกชื่อ หรือวางไฟล์ `.woff2` ไว้ที่นี่ |

## 7. ไอคอน → `assets/icons/`

ไอคอนทั่วไปใช้ **lucide-react** (ดูตาราง mapping ใน [02-ui-spec §4](./02-ui-spec.md#4-component-library)) — **ไม่ต้องหา**
วางไว้ที่นี่เฉพาะไอคอนที่ทำเองใน Figma และ lucide ไม่มี (export SVG, stroke 2px, viewBox 24)

## 8. เสียง → `assets/sounds/` (ทางเลือก)

| | ไฟล์ | ใช้ที่ |
|---|---|---|
| ⚪ | `success.mp3` (< 1 วิ, < 30KB) | เล่นตอนวาดถูกเสร็จใน L6/T7 (ผู้ใช้ต้องแตะจอก่อน browser ถึงยอมเล่นเสียง) |
| ⚪ | `warning.mp3` | T8 sheet เด้ง |

> ใช้เสียงที่มีสิทธิ์ใช้ (ทำเอง / CC0) เท่านั้น

## 9. ข้อห้ามด้าน asset (ตามกติกางาน)

- ❌ ห้ามใช้โลโก้จริงของ KBank / KBTG / K PLUS
- ❌ ห้ามใช้ภาพหน้าจอจริงของแอป K PLUS
- ❌ ห้ามใช้รูปบุคคลจริง / บัตรประชาชน / เอกสารจริง
- ✅ โลโก้ "K Sure" เป็นของทีม (แต่ชื่อ "K Sure" ต้องได้รับอนุมัติจากผู้จัดงานก่อนใช้ในเดโมสาธารณะ)
