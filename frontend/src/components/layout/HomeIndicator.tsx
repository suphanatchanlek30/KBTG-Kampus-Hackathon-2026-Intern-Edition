import { cn } from "@/lib/cn";

// Home indicator ปลอม — แสดงเฉพาะในกรอบโทรศัพท์ (Figma: แถบ 30px · ขีด 134×5 r3 ที่ y+12.5)
export function HomeIndicator({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("hidden h-[30px] shrink-0 justify-center pt-[12.5px] framed:flex", className)}>
      <div className="h-[5px] w-[134px] rounded-[3px] bg-white" />
    </div>
  );
}
