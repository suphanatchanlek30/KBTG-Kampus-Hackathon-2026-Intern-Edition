"use client";

import { Ban, Lock, MessageCircle, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { useHaptic, useMotionMode } from "@/components/motion/MotionMode";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { RulesList } from "@/components/ui/RulesList";
import { brand } from "@/config/brand";

type OffDealWarningSheetProps = {
  open: boolean;
  message: string;
  onCancelTransfer?: () => void;
  onProceed?: () => void;
};

export function OffDealWarningSheet({ open, message, onCancelTransfer, onProceed }: OffDealWarningSheetProps) {
  const full = useMotionMode() === "full";
  useHaptic(open ? [30, 60, 30] : null, 250);
  return (
    <BottomSheet
      open={open}
      onClose={onCancelTransfer ?? (() => {})}
      tone="light"
      className="items-center gap-2.5 rounded-t-[32px] pb-9 text-center framed:pb-9"
    >
      <div className="flex w-full flex-col items-center gap-2.5">
        <div className="pt-1.5">
          <span className="flex size-[60px] items-center justify-center rounded-full bg-warn-soft text-warn-edge">
            <motion.span
              className="flex"
              animate={full ? { rotate: [0, -8, 8, -6, 6, 0] } : undefined}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <TriangleAlert size={26} strokeWidth={1.8} />
            </motion.span>
          </span>
        </div>
        <h2 className="text-sheet-title">หยุดก่อน! นี่อาจเป็นการขอเงินนอกดีล</h2>
        <p className="h-[13px] -translate-y-[3px] text-meta leading-[19px] text-ink-2">{message}</p>
        <div className="w-full rounded-tile bg-sheet-list p-3.5 text-left">
          <RulesList
            tone="light"
            rules={[
              { icon: Ban, text: `เงินที่โอนนอกดีล ไม่ได้รับการคุ้มครองจาก ${brand.name}` },
              { icon: Lock, text: "ผู้ให้เช่าเห็นแล้วว่ามัดจำของคุณถูกกันไว้ ไม่จำเป็นต้องโอนเพิ่ม" },
              { icon: MessageCircle, text: `${brand.name} ไม่ส่งลิงก์ และไม่ขอ OTP ให้โอนเงิน` },
            ]}
          />
        </div>
        <Button variant="dark" onClick={onCancelTransfer}>
          ยกเลิกการโอน
        </Button>
        <button
          type="button"
          onClick={onProceed}
          className="pt-0.5 text-body font-medium text-ink-2 underline underline-offset-4"
        >
          ฉันเข้าใจความเสี่ยง และต้องการโอนต่อ
        </button>
      </div>
    </BottomSheet>
  );
}
