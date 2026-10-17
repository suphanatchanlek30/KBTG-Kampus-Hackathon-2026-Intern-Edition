import { cn } from "@/lib/cn";

export function HomeIndicator({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("hidden h-[30px] shrink-0 justify-center pt-[12.5px] framed:flex", className)}>
      <div className="h-[5px] w-[134px] rounded-[3px] bg-white" />
    </div>
  );
}
