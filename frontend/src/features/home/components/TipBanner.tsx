import { ChevronRight, Lock } from "lucide-react";
import { brand } from "@/config/brand";

export function TipBanner() {
  return (
    <section className="flex items-center gap-3 rounded-card bg-card p-4">
      <div className="flex size-[42px] shrink-0 items-center justify-center rounded-tile bg-card2 text-neon">
        <Lock size={18} strokeWidth={1.5} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="pt-[3px] text-row-title">
          ยังไม่เห็นห้อง <span className="text-highlight">อย่าเพิ่งโอนมัดจำ</span>
        </p>
        <p className="text-caption text-muted">กันเงินไว้กับ {brand.name} ก่อน ปล่อยเมื่อเข้าอยู่จริง</p>
      </div>
      <ChevronRight size={16} strokeWidth={1.47} className="shrink-0 text-muted" />
    </section>
  );
}
