import { Skeleton } from "@/components/ui/Skeleton";
import { AppShell } from "./AppShell";

export function ScreenSkeleton() {
  return (
    <AppShell className="flex flex-col gap-3 px-5 pt-[56px] pb-2">
      <Skeleton className="h-12 rounded-full" />
      <Skeleton className="h-[220px] rounded-card" />
      <Skeleton className="h-[140px] rounded-card" />
    </AppShell>
  );
}
