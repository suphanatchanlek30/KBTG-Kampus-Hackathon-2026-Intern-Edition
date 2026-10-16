"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { useDeal } from "@/features/deals/hooks";
import { ResultView } from "./ResultView";

/** /deals/[id]/result — D3 · ดีลยังไม่จบแบบไม่สำเร็จ → กลับหน้าสถานะ */
export function ResultScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);

  const notFailed = deal && !["REJECTED", "EXPIRED", "REFUNDED"].includes(deal.state);
  useEffect(() => {
    if (notFailed) router.replace(`/deals/${id}`);
  }, [notFailed, id, router]);

  if (error && !deal) return <ErrorScreen error={error} />;
  if (!deal || notFailed) return <ScreenSkeleton />;
  return <ResultView deal={deal} onHome={() => router.replace("/home")} />;
}
