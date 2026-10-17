"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { useMotionMode, type MotionMode } from "@/components/motion/MotionMode";
import { EASE_OUT_EXPO, REDUCED_FADE } from "@/components/motion/tokens";
import { Sparkle } from "@/components/ui/Sparkle";
import { SCREEN_BACKGROUNDS, type BackgroundId, type BackgroundShape } from "./backgrounds.generated";

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`;
};

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

export type HeroBackgroundOptions = {
  size: number;
  ripple?: number;
  offsetY?: number;
};

type ScreenBackgroundProps = {
  screen: BackgroundId;
  hero?: HeroBackgroundOptions;
};

export function ScreenBackground({ screen, hero }: ScreenBackgroundProps) {
  const mode = useMotionMode();
  const shapes = SCREEN_BACKGROUNDS[screen];
  const animated = hero && mode !== "static";

  const rings = shapes.filter((s) => s.kind === "ring").sort((a, b) => a.w - b.w);
  const inner = rings[0];

  return (
    <div aria-hidden className="absolute -top-[50px] left-[calc(50%-196.5px)] h-[852px] w-[393px] framed:top-0">
      {shapes.map((s, i) => {
        const style = shapeStyle(s);
        if (s.kind === "dot") {
          const sparkle = <Sparkle size={s.w} color={rgba(s.hex, s.alpha)} />;
          if (!animated) {
            return (
              <span key={i} className="absolute flex" style={style}>
                {sparkle}
              </span>
            );
          }
          const twinkle = {
            "--twinkle-delay": `${1.2 + jitter(i, 0.4)}s`,
            "--twinkle-duration": `${1.8 + jitter(i, 0.8)}s`,
          };
          return (
            <motion.span key={i} className="absolute flex" style={style} {...sparkleEnter(i, mode)}>
              <span className="flex motion-safe:animate-twinkle" style={twinkle as CSSProperties}>
                {sparkle}
              </span>
            </motion.span>
          );
        }
        if (!animated) return <div key={i} className="absolute" style={style} />;
        if (s.kind === "ring") {
          const order = rings.indexOf(s);
          return <motion.div key={i} className="absolute" style={style} {...ringEnter(order, mode)} />;
        }
        return (
          <motion.div
            key={i}
            className="absolute"
            style={style}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={mode === "reduced" ? REDUCED_FADE : { duration: 0.6, ease: "easeOut" }}
          />
        );
      })}

      {hero && inner && (
        <HeroGlow cx={inner.x + inner.w / 2} cy={inner.y + inner.h / 2 + (hero.offsetY ?? 0)} size={hero.size} />
      )}
      {animated && inner && mode === "full" && (
        <HeroLoops cx={inner.x + inner.w / 2} cy={inner.y + inner.h / 2 + (hero.offsetY ?? 0)} {...hero} />
      )}
    </div>
  );
}

function HeroGlow({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  return (
    <motion.span
      className="absolute rounded-full shadow-hero"
      style={{ left: cx - size / 2, top: cy - size / 2, width: size, height: size }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    />
  );
}

function HeroLoops({ cx, cy, size, ripple = 2.4 }: HeroBackgroundOptions & { cx: number; cy: number }) {
  const box: CSSProperties = { left: cx - size / 2, top: cy - size / 2, width: size, height: size };
  return (
    <>
      <span className="absolute rounded-full opacity-0 shadow-hero-glow motion-safe:animate-breathe" style={box} />
      <span
        className="absolute rounded-full border-[1.5px] border-neon opacity-0 motion-safe:animate-ripple"
        style={{ ...box, "--ripple-duration": `${ripple + 0.3}s` } as CSSProperties}
      />
    </>
  );
}

const jitter = (i: number, range: number) => Math.round(((i * 0.618034) % 1) * range * 100) / 100;

function ringEnter(order: number, mode: MotionMode) {
  if (mode === "reduced") {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: REDUCED_FADE };
  }
  return {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.6, ease: EASE_OUT_EXPO, delay: 0.05 + order * 0.08 },
  };
}

function sparkleEnter(i: number, mode: MotionMode) {
  if (mode === "reduced") {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: REDUCED_FADE };
  }
  return {
    initial: { opacity: 0, scale: 0.4 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, ease: EASE_OUT_EXPO, delay: 0.4 + jitter(i, 0.8) },
  };
}
