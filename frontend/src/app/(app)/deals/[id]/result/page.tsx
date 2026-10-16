import { Suspense } from "react";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { ResultScreen } from "@/features/receipt/components/ResultScreen";

export default function ResultPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ResultScreen />
    </Suspense>
  );
}
