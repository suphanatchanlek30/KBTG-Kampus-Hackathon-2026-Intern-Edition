import type { CSSProperties } from "react";
import { Sparkle } from "@/components/ui/Sparkle";
import { SCREEN_BACKGROUNDS, type BackgroundId, type BackgroundShape } from "./backgrounds.generated";

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`;
};

// Figma export ไม่มีค่ามุมหมุน — แถบ sweep ใน mockup เอียงขึ้นทางขวา ประมาณจากภาพ
const SWEEP_ROTATE_DEG = -24;

function shapeStyle(s: BackgroundShape): CSSProperties {
  const box: CSSProperties = { left: s.x, top: s.y, width: s.w, height: s.h };
  switch (s.kind) {
    case "glow":
      return { ...box, background: `radial-gradient(closest-side, ${rgba(s.hex, s.alpha)}, ${rgba(s.hex, 0)})` };
    case "sweep":
      return {
        ...box,
        background: `linear-gradient(90deg, ${rgba(s.hex, 0)}, ${rgba(s.hex, s.alpha)} 50%, ${rgba(s.hex, 0)})`,
        transform: `rotate(${SWEEP_ROTATE_DEG}deg)`,
        filter: "blur(20px)",
      };
    case "ring":
      return { ...box, borderRadius: "50%", border: `${s.stroke ?? 1}px solid ${rgba(s.hex, s.alpha)}` };
    case "dot":
      return box;
  }
}

/**
 * ลายพื้นหลังของหน้าจอ (แสงเขียว, วงแหวน, จุด) ตามค่า Figma ของแต่ละหน้า
 * พิกัดอ้างอิงเฟรม 393×852 ที่มี status bar 50px — บนมือถือจริงไม่มี status bar จึงเลื่อนขึ้น 50px
 */
export function ScreenBackground({ screen }: { screen: BackgroundId }) {
  return (
    <div aria-hidden className="absolute inset-x-0 -top-[50px] h-[852px] framed:top-0">
      {SCREEN_BACKGROUNDS[screen].map((s, i) =>
        // "dot" ใน Figma คือประกาย ✦ 4 แฉก
        s.kind === "dot" ? (
          <Sparkle key={i} size={s.w} color={rgba(s.hex, s.alpha)} className="absolute" style={shapeStyle(s)} />
        ) : (
          <div key={i} className="absolute" style={shapeStyle(s)} />
        ),
      )}
    </div>
  );
}
