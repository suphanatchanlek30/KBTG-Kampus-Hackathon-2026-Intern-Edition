# docs/design — รูปดีไซน์อ้างอิง (K Sure UI v3-final)

แหล่งที่มา: Figma [UI-KBTG](https://www.figma.com/design/KLFeKqPDsAOhGLcbfrjT7N/UI-KBTG?node-id=29-2) เฟรม **K Sure UI v3-final** (node `29:2`)

| ไฟล์ | คือ |
|---|---|
| `screens/L1.png` … `screens/L6.png` | หน้าจอผู้ให้เช่า export จาก Figma **2x** ครอปพอดีเฟรม (786×1704 = 393×852 @2x) |
| `screens/T1.png` … `screens/T8.png` | หน้าจอผู้เช่า (เหมือนกัน) |
| [`figma-spec/`](./figma-spec/) | **ค่าละเอียดทุก layer ต่อหน้าจอ** (ขนาด, ตำแหน่ง, สี, padding, ฟอนต์, เงา) |
| `foundations.png` | สี, ฟอนต์, โลโก้, หลักการออกแบบ (2x) |
| `ksure-ui-v3-final-full.png` | ภาพรวมทั้งเฟรม (ย่อเหลือกว้าง 4000px) |
| `flow-landlord.png`, `flow-tenant.png` | ภาพที่ส่งมาตอนแรก (ใช้ใน README) |
| `compare/` | (สร้างใน Phase 2) screenshot หน้าที่ทำจริง วางคู่กับ mockup |

**วิธีใช้เทียบความเป๊ะ:** หน้า `/dev/overlay?screen=L1` แสดงรูปจาก `screens/` ที่ความกว้าง 393px (`width: 393px` ภาพจะย่อจาก 2x พอดี) วางทับหน้าจริงแบบโปร่งแสง — ดู [06-roadmap Phase 1–2](../06-roadmap.md)

> ⚠️ ในเฟรมมี status bar `9:41` และ home indicator — หน้าจริงบนมือถือไม่แสดงสองส่วนนี้ (ดู [02-ui-spec §2](../02-ui-spec.md#2-layout--responsive-มือถือเป็นหลัก)) ตอนเทียบบนมือถือให้ดูเฉพาะส่วนเนื้อหา
