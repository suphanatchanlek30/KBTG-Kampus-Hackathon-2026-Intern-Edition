"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { RotateCcw, ScanLine, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { StickyFooter } from "@/components/layout/StickyFooter";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { toast } from "@/components/ui/Toast";

import { invitationIdFromScan } from "../parse";

const QrScanner = dynamic(() => import("@yudiel/react-qr-scanner").then(({ Scanner }) => Scanner), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-card2" />,
});

type CameraIssue = "invalid-code" | "permission" | "unavailable" | "secure-context" | "unknown";

function cameraIssueFrom(kind: string): CameraIssue {
  if (kind === "permission-denied" || kind === "security") return "permission";
  if (kind === "no-camera" || kind === "in-use" || kind === "overconstrained") {
    return "unavailable";
  }
  if (kind === "insecure-context") return "secure-context";
  return "unknown";
}

const CAMERA_ISSUE_COPY: Record<CameraIssue, { title: string; description: string }> = {
  "invalid-code": {
    title: "QR นี้ไม่ใช่คำขอ K Sure",
    description: "ลองสแกนใหม่ หรือกรอกรหัสคำขอด้านล่าง",
  },
  permission: {
    title: "ยังใช้กล้องไม่ได้",
    description: "อนุญาตการใช้กล้องในเบราว์เซอร์ แล้วลองใหม่อีกครั้ง",
  },
  unavailable: {
    title: "ไม่พบกล้องที่ใช้งานได้",
    description: "ปิดแอปที่กำลังใช้กล้องอยู่ หรือลองกรอกรหัสคำขอแทน",
  },
  "secure-context": {
    title: "ต้องเปิดผ่าน HTTPS",
    description: "กล้องจะใช้งานได้บน HTTPS หรือ localhost เท่านั้น",
  },
  unknown: {
    title: "เปิดกล้องไม่สำเร็จ",
    description: "ลองใหม่อีกครั้ง หรือกรอกรหัสคำขอแทน",
  },
};

export function ScanScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const [manualValue, setManualValue] = useState("");
  const [cameraIssue, setCameraIssue] = useState<CameraIssue | null>(null);
  const [scannerKey, setScannerKey] = useState(0);

  const openInvitation = useCallback(
    (rawValue: string) => {
      const invitationId = invitationIdFromScan(rawValue);

      if (!invitationId) {
        setCameraIssue("invalid-code");
        toast.error("QR นี้ไม่ใช่คำขอ K Sure");
        return;
      }

      router.push(`/invites/${encodeURIComponent(invitationId)}`);
    },
    [router],
  );

  const restartCamera = () => {
    setCameraIssue(null);
    setScannerKey((current) => current + 1);
  };

  const issueCopy = cameraIssue ? CAMERA_ISSUE_COPY[cameraIssue] : null;

  return (
    <AppShell
      enter="modal"
      header={<AppHeader title="สแกนคำขอ K Sure" onLeft={() => router.push("/home")} />}
      footer={
        <StickyFooter>
          <FormField label="กรอกรหัสคำขอ" htmlFor="manual-invitation-code">
            <input
              id="manual-invitation-code"
              value={manualValue}
              placeholder="เช่น KS-AB12CD"
              onChange={(event) => setManualValue(event.target.value)}
              className="w-full bg-transparent text-body text-white outline-none placeholder:text-gray"
            />
          </FormField>
          <Button className="w-full" disabled={!manualValue.trim()} onClick={() => openInvitation(manualValue)}>
            เปิดคำขอ
          </Button>
        </StickyFooter>
      }
    >
      <main className="flex min-h-full flex-col px-5 pt-5 pb-6">
        <div className="mb-5">
          <p className="text-title">สแกน QR ของผู้ให้เช่า</p>
          <p className="mt-1 text-sm leading-6 text-muted">ตรวจสอบรายละเอียดและกดดำเนินการด้วยตัวเองก่อนทุกครั้ง</p>
        </div>

        <div className="shadow-glow relative min-h-[360px] flex-1 overflow-hidden rounded-card border border-neon/35 bg-card2">
          {!cameraIssue && (
            <QrScanner
              key={scannerKey}
              constraints={{ facingMode: "environment" }}
              formats={["qr_code"]}
              paused={pathname !== "/scan"}
              sound={false}
              components={{ finder: false }}
              classNames={{
                container: "h-full w-full",
                video: "h-full w-full object-cover",
              }}
              onError={(error) => setCameraIssue(cameraIssueFrom(error.kind))}
              onScan={(codes) => {
                const rawValue = codes[0]?.rawValue;
                if (rawValue) openInvitation(rawValue);
              }}
            />
          )}

          {!cameraIssue && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-7 rounded-2xl border border-neon/70">
              <span className="absolute -top-px -left-px h-9 w-9 rounded-tl-2xl border-t-2 border-l-2 border-neon" />
              <span className="absolute -top-px -right-px h-9 w-9 rounded-tr-2xl border-t-2 border-r-2 border-neon" />
              <span className="absolute -bottom-px -left-px h-9 w-9 rounded-bl-2xl border-b-2 border-l-2 border-neon" />
              <span className="absolute -right-px -bottom-px h-9 w-9 rounded-br-2xl border-r-2 border-b-2 border-neon" />
            </div>
          )}

          {issueCopy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <TriangleAlert className="text-warning mb-3 h-8 w-8" aria-hidden="true" />
              <p className="text-base font-semibold text-ink">{issueCopy.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{issueCopy.description}</p>
              <Button variant="secondary" className="mt-5" onClick={restartCamera}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                ลองเปิดกล้องอีกครั้ง
              </Button>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-card border border-line bg-card px-4 py-3">
          <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-neon" aria-hidden="true" />
          <p className="text-sm leading-6 text-muted">
            รองรับ QR ของ K Sure และรหัสคำขอ เช่น <span className="font-semibold tracking-wide text-neon">KS-AB12CD</span>
          </p>
        </div>
      </main>
    </AppShell>
  );
}
