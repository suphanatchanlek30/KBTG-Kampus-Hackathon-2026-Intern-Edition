import {
  ArrowUpDown,
  ChartColumn,
  LayoutGrid,
  ScanBarcode,
  Smartphone,
  Wallet,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { forwardRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

/** กรอบสแกน + สี่เหลี่ยมกลาง (lucide ไม่มีไอคอนนี้) */
const ScanSquare = forwardRef<SVGSVGElement, LucideProps>(function ScanSquare(
  { size = 24, strokeWidth = 2, ...props },
  ref,
) {
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1" />
    </svg>
  );
}) as LucideIcon;

/** ไม่มี href = บริการที่ยังไม่ได้ทำ — แสดงเป็นปุ่มที่กดแล้วไม่ไปไหน */
type Service = { label: string; icon?: LucideIcon; href?: string; active?: boolean };

/** ช่องบริการ L1/T1 (Figma: การ์ด r20 pad16 · ช่อง 52×52 r18 · ป้าย 11.5/400 · gap 7) */
export function ServiceGrid({ kSureHref, compact = false }: { kSureHref?: string; compact?: boolean }) {
  const services: Service[] = [
    { label: "โอนเงิน", icon: ArrowUpDown, href: "/transfer" },
    { label: "สแกนจ่าย", icon: ScanSquare },
    { label: "จ่ายบิล", icon: ScanBarcode },
    { label: brand.name, href: kSureHref, active: true },
    { label: "เติมเงิน", icon: Smartphone },
    { label: "My Pockets", icon: Wallet },
    { label: "ลงทุน", icon: ChartColumn },
    { label: "ทั้งหมด", icon: LayoutGrid },
  ];

  // T1 แสดงแถวเดียว ไม่มีหัวข้อ
  const visible = compact ? services.slice(0, 4) : services;

  return (
    <section className="flex flex-col gap-2.5 rounded-card bg-card p-4">
      {!compact && <h2 className="text-section">บริการแนะนำ</h2>}
      <div className="grid grid-cols-4 gap-x-[5.9px] gap-y-[14px]">
        {visible.map(({ label, icon: Icon, href, active }) => {
          const tile = (
            <>
              <span
                className={cn(
                  "flex size-[52px] items-center justify-center rounded-[18px] border transition-transform group-active:scale-[0.94]",
                  active ? "border-neon/55 bg-black shadow-tile-active" : "border-neon/18 bg-neon/9 text-neon",
                )}
              >
                {Icon ? (
                  <Icon size={21} strokeWidth={1.49} />
                ) : (
                  <Image src={brand.mark.src} alt="" width={22} height={21} />
                )}
              </span>
              <span className={cn("text-service-label", active ? "font-semibold text-neon" : "text-gray")}>
                {label}
              </span>
            </>
          );
          const className = "group flex flex-col items-center gap-[7px]";
          return href ? (
            <Link key={label} href={href} className={className}>
              {tile}
            </Link>
          ) : (
            <button key={label} type="button" className={className}>
              {tile}
            </button>
          );
        })}
      </div>
    </section>
  );
}
