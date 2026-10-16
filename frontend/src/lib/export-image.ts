// บันทึกส่วนหนึ่งของหน้าเป็นรูป PNG — **ใส่ลายน้ำ SIMULATED · Prototype ทุกครั้ง** (docs/06-roadmap.md Phase 8)
// กันรูปหลักฐาน/QR ถูกนำไปใช้เป็นสลิปปลอม: ลายน้ำถูกใส่ลงใน DOM ระหว่างจับภาพ จึงไม่มีทางได้รูปที่ไม่มีลายน้ำ
import { toPng } from "html-to-image";
import { brand } from "@/config/brand";

/** หา element ที่มองเห็นอยู่ — หน้าที่ซ่อนใน <Activity> ยังมี DOM อยู่ (display: none) */
export function findVisible(selector: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => el.getClientRects().length > 0) ?? null
  );
}

function watermark(): HTMLElement {
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: "50",
    borderRadius: "inherit",
  } satisfies Partial<CSSStyleDeclaration>);
  for (let i = 0; i < 4; i++) {
    const line = document.createElement("span");
    line.textContent = `${brand.exportWatermark}   ${brand.exportWatermark}`;
    Object.assign(line.style, {
      transform: "rotate(-24deg)",
      whiteSpace: "nowrap",
      font: "700 15px var(--font-poppins), sans-serif",
      letterSpacing: "0.08em",
      color: "rgba(226, 64, 64, 0.38)",
    } satisfies Partial<CSSStyleDeclaration>);
    layer.append(line);
  }
  return layer;
}

/** จับภาพ node พร้อมลายน้ำ → Blob PNG */
export async function captureWithWatermark(node: HTMLElement): Promise<Blob> {
  const layer = watermark();
  const prevPosition = node.style.position;
  if (getComputedStyle(node).position === "static") node.style.position = "relative";
  node.append(layer);
  try {
    const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
    return await (await fetch(dataUrl)).blob();
  } finally {
    layer.remove();
    node.style.position = prevPosition;
  }
}

/**
 * บันทึกรูป: มือถือที่แชร์ไฟล์ได้ → แผ่นแชร์ของระบบ (บันทึกลงคลังภาพได้) · อื่นๆ → ดาวน์โหลดไฟล์
 * คืน "shared" | "downloaded" | "cancelled"
 */
export async function saveImage(node: HTMLElement, filename: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await captureWithWatermark(node);
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

/** แชร์ข้อความ/ลิงก์ (Web Share API) — ไม่รองรับ → คัดลอกแทน · คืน "shared" | "copied" | "cancelled" */
export async function shareText(data: { title: string; text: string; url?: string }) {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return "shared" as const;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled" as const;
    }
  }
  await navigator.clipboard.writeText([data.text, data.url].filter(Boolean).join("\n"));
  return "copied" as const;
}
