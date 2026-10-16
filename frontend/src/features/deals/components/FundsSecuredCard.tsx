import { Hourglass, Lock } from "lucide-react";
import { MintCardDecor } from "@/components/ui/MintCardDecor";
import { cn } from "@/lib/cn";
import { formatBaht } from "@/lib/format/money";
import type { DealDTO } from "@/types/api";
import { isFundsSecured, trancheStatusLabel } from "../state";

/**
 * การ์ด Funds Secured L5 (Figma: 353×222 r20 grad-mint · pad 16 · ไอคอนล็อก 44 r22 · กล่องย่อย r14 ขาว/45)
 * pending = D1 ก่อนผู้เช่ากันเงิน — การ์ดสีเทา (⚠️ D1 ยังรออนุมัติดีไซน์: docs/01-user-flow.md §7)
 */
export function FundsSecuredCard({ deal }: { deal: DealDTO }) {
  const secured = isFundsSecured(deal.state);
  const tenantSide = deal.myRole === "TENANT";

  const description = !secured ? (
    "เมื่อผู้เช่ายอมรับและกันเงิน การ์ดนี้จะเปลี่ยนเป็น Funds Secured ทันที — ระหว่างนี้ยังไม่มีเงินถูกกัน"
  ) : tenantSide ? (
    "เงินยังอยู่ในบัญชีของคุณ แต่ถูกกันไว้สำหรับดีลนี้ — ปล่อยได้ด้วยการกดยืนยันของคุณเท่านั้น"
  ) : (
    <>
      เงินอยู่ในบัญชีผู้เช่าและถูกกันไว้สำหรับดีลนี้ — ผู้เช่าใช้จ่ายไม่ได้
      <br />
      และคุณถอนเองไม่ได้ จนกว่าผู้เช่าจะกดยืนยัน
    </>
  );

  const boxes = [
    { key: "BOOKING_FEE", label: "ค่าจอง", amount: deal.amounts.bookingFeeSatang },
    { key: "MAIN_DEPOSIT", label: "มัดจำหลัก", amount: deal.amounts.mainDepositSatang },
  ] as const;

  return (
    <section
      className={cn(
        "relative flex flex-col gap-2.5 overflow-hidden rounded-card p-4",
        secured ? "bg-grad-mint text-ink-mint shadow-mint" : "bg-card2 text-gray",
      )}
    >
      {secured && <MintCardDecor />}

      <div className="relative flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            secured ? "bg-ink text-white" : "bg-line text-gray",
          )}
        >
          {secured ? <Lock size={19} strokeWidth={1.6} /> : <Hourglass size={19} strokeWidth={1.6} />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={cn("text-eyebrow", secured ? "text-parsley" : "text-muted")}>
            {secured ? "FUNDS SECURED" : "WAITING"}
          </span>
          <span className={cn("text-header", secured ? "text-ink" : "text-white")}>
            {secured ? "เงินถูกกันไว้แล้ว" : "รอผู้เช่ากันเงิน"}
          </span>
        </div>
        <span className={cn("text-amount-lg tabular-nums", secured ? "text-ink" : "text-white")}>
          {formatBaht(deal.amounts.totalSatang)}
        </span>
      </div>

      <p className="relative text-caption">{description}</p>

      <div className="relative grid grid-cols-2 gap-2.5">
        {boxes.map((b) => (
          <div
            key={b.key}
            className={cn(
              "flex flex-col gap-1.5 rounded-tile border px-3 py-2.5",
              secured ? "border-white/30 bg-white/45" : "border-line bg-card",
            )}
          >
            <span className="text-caption">{b.label}</span>
            <span className={cn("text-amount-row tabular-nums", secured ? "text-ink" : "text-white")}>
              {formatBaht(b.amount)}
            </span>
            <span className="text-badge font-medium">{trancheStatusLabel(deal, b.key)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
