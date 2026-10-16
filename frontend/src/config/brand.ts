// ⚠️ ข้อความแบรนด์ทั้งหมดอยู่ที่นี่ที่เดียว — เปลี่ยนชื่อทั้งแอปได้ในไฟล์นี้
// ชื่อ "K Sure" ต้องได้รับอนุมัติจากผู้จัดงานก่อนใช้ในเดโมสาธารณะ (docs/07-assets.md §9)

export const brand = {
  name: "K Sure",
  tagline: "มัดจำห้อง แบบไม่ต้องลุ้น",
  taglineHighlight: "แบบไม่ต้องลุ้น",
  /**
   * ชื่อแอปธนาคารที่ K Sure อยู่ข้างใน — ตอนนี้ใช้ตาม mockup ("K PLUS")
   * ⚠️ สเปกต้นฉบับห้ามใช้ชื่อ KBank / KBTG / K PLUS ในเดโมสาธารณะ — รอทีมตัดสินใจ (docs/06-roadmap.md Phase 0)
   */
  hostAppName: "K PLUS",
  disclaimer: "Prototype only · No real funds",
  exportWatermark: "SIMULATED · Prototype",
  logo: { src: "/brand/ksure-logo.png", width: 841, height: 258 },
  mark: { src: "/brand/ksure-mark.png", width: 268, height: 258 },
} as const;
