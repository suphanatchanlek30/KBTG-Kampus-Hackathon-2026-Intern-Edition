import { Suspense } from "react";
import { OverlayTool } from "./OverlayTool";

export default function OverlayPage() {
  return (
    <Suspense>
      <OverlayTool />
    </Suspense>
  );
}
