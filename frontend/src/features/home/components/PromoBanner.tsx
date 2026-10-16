import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { brand } from "@/config/brand";
import { ShieldHouseBaht } from "./ShieldHouseBaht";

/** แบนเนอร์ K Sure บน L1 (Figma: 353×166 · r28 · grad-request · ขอบ neon/35) */
export function PromoBanner({ href }: { href: string }) {
  const [before] = brand.tagline.split(brand.taglineHighlight);
  return (
    <section className="relative overflow-hidden rounded-card-xl border border-neon/35 bg-grad-request px-[18px] pt-[18px] pb-[18px]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-px left-[252px] size-[140px] rounded-full border border-neon/22" />
        <div className="absolute top-[-29px] left-[222px] size-[200px] rounded-full border border-neon/12" />
        <div className="absolute top-[-63px] left-[188px] size-[268px] rounded-full border border-neon/6" />
      </div>
      <ShieldHouseBaht className="absolute top-[30px] left-[241px]" />

      <div className="relative flex w-[211px] flex-col gap-[5px]">
        <div className="flex items-center gap-2">
          <Image src={brand.logo.src} alt={brand.name} width={74} height={23} className="h-[23px] w-[74px]" />
          <Badge variant="new">ใหม่</Badge>
        </div>
        <p className="text-promo-title whitespace-nowrap">
          {before}
          <span className="text-highlight">{brand.taglineHighlight}</span>
        </p>
        <p className="text-service-label leading-[17.2px] text-gray">
          เงินผู้เช่าถูกกันไว้จนกว่าจะเข้าอยู่จริง
          <br />
          ผู้ให้เช่าเห็นว่าเงินพร้อมแล้ว
        </p>
        <div className="pt-1.5">
          <Link
            href={href}
            className="inline-flex h-7 items-center gap-0.5 rounded-full bg-neon pr-3.5 pl-4 text-caption font-semibold text-ink transition-transform active:scale-[0.97]"
          >
            สร้างดีลเลย
            <ChevronRight size={13} strokeWidth={1.41} />
          </Link>
        </div>
      </div>
    </section>
  );
}
