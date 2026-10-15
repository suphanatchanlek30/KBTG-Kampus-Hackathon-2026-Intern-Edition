# docs/design/figma-spec — ค่าจริงจาก Figma ต่อหน้าจอ

ดึงจาก Figma [UI-KBTG](https://www.figma.com/design/KLFeKqPDsAOhGLcbfrjT7N/UI-KBTG?node-id=29-2) เฟรม **K Sure UI v3-final** (node `29:2`) ผ่าน Figma REST API

| ไฟล์ | node | | ไฟล์ | node |
|---|---|---|---|---|
| [L1.md](./L1.md) | `29:172` | | [T1.md](./T1.md) | `29:1114` |
| [L2.md](./L2.md) | `29:402` | | [T2.md](./T2.md) | `29:1313` |
| [L3.md](./L3.md) | `29:553` | | [T3.md](./T3.md) | `29:1446` |
| [L4.md](./L4.md) | `29:701` | | [T4.md](./T4.md) | `29:1537` |
| [L5.md](./L5.md) | `29:813` | | [T5.md](./T5.md) | `29:1664` |
| [L6.md](./L6.md) | `29:975` | | [T6.md](./T6.md) | `29:1780` |
| | | | [T7.md](./T7.md) | `29:1912` |
| | | | [T8.md](./T8.md) | `29:2045` |

## อ่านยังไง

แต่ละบรรทัด = 1 layer เรียงตามลำดับซ้อนกัน (ย่อหน้า = ลูก)

```text
- frame · 353×54 · @20,704 · r100 · bg #5DF591 · shadow 0 10 26 0 #5DF591/0.22 · horizontal gap8 pad0/0/0/0
          กว้าง×สูง  x,y จากมุมซ้ายบนจอ  radius  พื้น       เงา x y blur spread สี      auto-layout  padding บน/ขวา/ล่าง/ซ้าย
- text · … · "ถัดไป" Poppins 600 16/23.2 ls-0.2
                      ฟอนต์  น้ำหนัก ขนาด/line-height  letter-spacing
```

- `#5DF591/0.22` = สีนั้นที่ opacity 22% → CSS `rgb(93 245 145 / 0.22)`
- `horizontal` / `vertical` = auto layout → `flex-row` / `flex-col`
- `linear[…] handles (0,0) (1,1)` = gradient จากมุมซ้ายบนไปขวาล่าง (≈135deg)
- `inset 3 0 0 0 #5DF591` = `box-shadow: inset 3px 0 0 #5DF591` (แถบสีด้านซ้าย)
- ไฟล์ `.json` ข้างกัน = ข้อมูลเดียวกันแบบ machine-readable

## ข้อควรรู้

- เฟรมนี้มาจากการ import HTML เข้า Figma — ชื่อ layer เป็น `Container` / `Paragraph` ไม่ได้ตั้งชื่อ component
- ข้อความยอดเงินใน Figma มี `฿` นำหน้า (ฟอนต์ Arimo) — **ตัดสินแล้ว: ไม่แสดง ฿** ใช้แค่ตัวเลขด้วยฟอนต์ Poppins (ดู [02-ui-spec §1.2](../../02-ui-spec.md#12-typography))
- Status bar `9:41` และ home indicator อยู่ในเฟรม แต่ใช้แสดงเฉพาะ desktop preview เท่านั้น
- ถ้าแก้ดีไซน์ใน Figma ให้รัน `./scripts/figma/sync.sh` เพื่อสร้างไฟล์ชุดนี้ใหม่ (ต้องมี token ใน `~/.figma_token`)
