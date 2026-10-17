"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useMotionMode, type MotionMode } from "@/components/motion/MotionMode";
import { EASE_OUT_EXPO, REDUCED_FADE } from "@/components/motion/tokens";
import { brand } from "@/config/brand";

const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function QrCard({ value }: { value: string }) {
  return (
    <motion.div
      className="relative mx-auto flex size-[184px] items-center justify-center rounded-[24px] bg-white"
      {...qrEnter(useMotionMode())}
    >
      <QRCodeSVG
        value={value}
        size={160}
        level="H"
        bgColor="#FFFFFF"
        fgColor="#0A0A0B"
        imageSettings={{ src: TRANSPARENT_PIXEL, width: 44, height: 44, excavate: true }}
        title="QR คำขอ"
      />
      <div className="absolute flex size-11 items-center justify-center rounded-[13px] border-[3px] border-white bg-ink">
        <Image src={brand.mark.src} alt="" width={22} height={21} />
      </div>
    </motion.div>
  );
}

function qrEnter(mode: MotionMode) {
  if (mode === "static") return {};
  if (mode === "reduced") return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: REDUCED_FADE };
  return {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.35, ease: EASE_OUT_EXPO, delay: 0.1 },
  };
}
