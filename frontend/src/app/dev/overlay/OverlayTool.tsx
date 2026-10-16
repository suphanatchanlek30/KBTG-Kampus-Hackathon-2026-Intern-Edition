"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { cn } from "@/lib/cn";
import { SCREEN_IDS, SCREENS, isScreenId } from "./screens";

/**
 * วาง mockup (docs/design/screens → public/dev/screens, รูป 2x) ทับหน้าจริงในกรอบ 393×852
 * ?screen=L1&opacity=0.5&controls=0 · คีย์ลัด: O = ซ่อน/แสดง mockup · [ ] = ลด/เพิ่ม opacity · D = โหมด difference
 */
export function OverlayTool() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const rawScreen = params.get("screen");
  const screen = isScreenId(rawScreen) ? rawScreen : "L1";
  const [opacity, setOpacity] = useState(() => clamp(Number(params.get("opacity") ?? 0.5)));
  const [visible, setVisible] = useState(true);
  const [difference, setDifference] = useState(false);

  const showControls = params.get("controls") !== "0";
  const Screen = SCREENS[screen];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "o") setVisible((v) => !v);
      if (e.key === "d") setDifference((v) => !v);
      if (e.key === "[") setOpacity((v) => clamp(v - 0.1));
      if (e.key === "]") setOpacity((v) => clamp(v + 0.1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectScreen = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("screen", id);
    router.replace(`${pathname}?${next}`);
  };

  return (
    <>
      <PhoneFrame forceFrame>
        {Screen ? (
          <Screen />
        ) : (
          <div className="flex flex-1 items-center justify-center px-8 text-center text-body text-muted">
            ยังไม่มีหน้าจอ {screen} — เพิ่มใน src/app/dev/overlay/screens.tsx (Phase 2)
          </div>
        )}
        {visible && (
          // eslint-disable-next-line @next/next/no-img-element -- รูปอ้างอิงต้องแสดงขนาดจริง ไม่ผ่าน optimizer
          <img
            src={`/dev/screens/${screen}.png`}
            alt=""
            width={393}
            height={852}
            className={cn(
              "pointer-events-none absolute inset-0 z-[100] h-[852px] w-[393px] max-w-none select-none",
              difference && "mix-blend-difference",
            )}
            style={{ opacity }}
          />
        )}
      </PhoneFrame>

      {showControls && (
        <div className="fixed right-3 bottom-3 z-[200] flex w-56 flex-col gap-2 rounded-2xl border border-line bg-card/95 p-3 text-caption shadow-xl backdrop-blur">
          <label className="flex items-center justify-between gap-2">
            หน้าจอ
            <select
              value={screen}
              onChange={(e) => selectScreen(e.target.value)}
              className="rounded-lg bg-card2 px-2 py-1"
            >
              {SCREEN_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                  {SCREENS[id] ? "" : " (ยังไม่มี)"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-14">{Math.round(opacity * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="flex-1 accent-neon"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                className="accent-neon"
              />
              mockup (O)
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={difference}
                onChange={(e) => setDifference(e.target.checked)}
                className="accent-neon"
              />
              diff (D)
            </label>
          </div>
        </div>
      )}
    </>
  );
}

function clamp(v: number) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, Math.round(v * 100) / 100)) : 0.5;
}
