// แปลง state ของดีล → ป้าย / ข้อความ / ขั้นไทม์ไลน์ ตามมุมของแต่ละ role (docs/01-user-flow.md §6)
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatBaht } from "@/lib/format/money";
import type { DealDTO, DealEventType, DealState } from "@/types/api";

export type BadgeInfo = { label: string; variant: "warn-soft" | "neon-soft" | "muted" };

export function stateBadge(state: DealState): BadgeInfo {
  switch (state) {
    case "WAITING_ACCEPT":
      return { label: "รอผู้เช่ายอมรับ", variant: "muted" };
    case "FUNDS_LOCKED":
    case "BOOKING_FEE_RELEASED":
      return { label: "กำลังดำเนินการ", variant: "warn-soft" };
    case "RELEASED":
      return { label: "สำเร็จ", variant: "neon-soft" };
    case "REJECTED":
      return { label: "ถูกปฏิเสธ", variant: "muted" };
    case "EXPIRED":
      return { label: "หมดอายุ", variant: "muted" };
    case "REFUNDED":
      return { label: "คืนเงินแล้ว", variant: "muted" };
  }
}

/** ดีลอยู่ในสถานะที่กันเงินแล้วหรือไม่ (มีเงินถูกกันหรือเคยกัน) */
export const isFundsSecured = (state: DealState) =>
  state === "FUNDS_LOCKED" || state === "BOOKING_FEE_RELEASED" || state === "RELEASED";

/** ดีลจบแบบไม่สำเร็จ → หน้า D3 (Phase 8) */
export const isClosedUnsuccessfully = (state: DealState) =>
  state === "REJECTED" || state === "EXPIRED" || state === "REFUNDED";

export type TimelineStatus = "done" | "current" | "upcoming";
export type TimelineStep = { key: string; title: string; detail: string; status: TimelineStatus };

const eventAt = (deal: DealDTO, type: DealEventType) => deal.timeline.find((e) => e.type === type)?.at;

/** ไทม์ไลน์ 4 ขั้นคงที่ของ L5/D8 (docs/05-api.md: timeline → 4 ขั้น) */
export function timelineSteps(deal: DealDTO): TimelineStep[] {
  const { amounts } = deal;
  const locked = eventAt(deal, "FUNDS_LOCKED");
  const bookingReleased = eventAt(deal, "BOOKING_FEE_RELEASED");
  const mainReleased = eventAt(deal, "MAIN_DEPOSIT_RELEASED");
  const moveIn = `${deal.moveInDate}T00:00:00+07:00`;
  const tenantSide = deal.myRole === "TENANT";

  const reached = [true, Boolean(locked), Boolean(bookingReleased), Boolean(mainReleased)];
  const currentIndex = reached.indexOf(false);
  const status = (i: number): TimelineStatus => (reached[i] ? "done" : i === currentIndex ? "current" : "upcoming");

  return [
    { key: "created", title: "สร้างคำขอ", detail: formatDateTime(deal.createdAt), status: status(0) },
    {
      key: "locked",
      title: `${tenantSide ? "คุณยอมรับ" : "ผู้เช่ายอมรับ"} และกันเงิน ${formatBaht(amounts.totalSatang)}`,
      detail: locked ? formatDateTime(locked) : "รอผู้เช่ายอมรับคำขอ",
      status: status(1),
    },
    {
      key: "viewing",
      title: "นัดดูห้อง",
      detail: bookingReleased
        ? `${formatDateTime(bookingReleased)} — ปล่อยค่าจองแล้ว ${formatBaht(amounts.bookingFeeSatang)}`
        : `${formatDateTime(deal.viewingAt)} — ยืนยันแล้วปล่อยค่าจอง ${formatBaht(amounts.bookingFeeSatang)}`,
      status: status(2),
    },
    {
      key: "move-in",
      title: "เข้าอยู่",
      detail: mainReleased
        ? `${formatDateTime(mainReleased)} — ปล่อยมัดจำหลักแล้ว ${formatBaht(amounts.mainDepositSatang)}`
        : `${formatDate(moveIn)} — ยืนยันแล้วปล่อยมัดจำหลัก ${formatBaht(amounts.mainDepositSatang)}`,
      status: status(3),
    },
  ];
}

/** ข้อความสถานะใต้ยอดในกล่องค่าจอง/มัดจำหลักของการ์ด Funds Secured */
export function trancheStatusLabel(deal: DealDTO, key: "BOOKING_FEE" | "MAIN_DEPOSIT"): string {
  const tranche = deal.tranches.find((t) => t.key === key);
  const tenantSide = deal.myRole === "TENANT";
  if (tranche?.status === "RELEASED") return tenantSide ? "ปล่อยแล้ว ✓" : "ได้รับแล้ว ✓";
  if (tranche?.status === "REFUNDED") return "คืนผู้เช่าแล้ว";
  if (tranche?.status === "PENDING") return "ยังไม่กันเงิน";
  if (key === "BOOKING_FEE") return tenantSide ? "ปล่อยเมื่อคุณดูห้อง" : "รอผู้เช่าดูห้อง";
  return tenantSide ? "ปล่อยเมื่อคุณเข้าอยู่" : "รอผู้เช่าเข้าอยู่";
}
