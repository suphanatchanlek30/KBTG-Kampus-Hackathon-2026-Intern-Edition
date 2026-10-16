import { Suspense } from "react";
import { OverlayTool } from "./OverlayTool";

export default function OverlayPage() {
  // useSearchParams ต้องอยู่ใน Suspense (cacheComponents)
  return (
    <Suspense>
      <OverlayTool />
    </Suspense>
  );
}
