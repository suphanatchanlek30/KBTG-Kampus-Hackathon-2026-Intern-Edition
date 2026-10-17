"use client";

import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/lib/api/errors";
import { AppShell } from "./AppShell";

export function ErrorScreen({ error, title = "เปิดรายการนี้ไม่ได้" }: { error: unknown; title?: string }) {
  const router = useRouter();
  return (
    <AppShell
      enter="push"
      header={<AppHeader title="K Sure" left="back" onLeft={() => router.push("/home")} />}
      footer={
        <div className="px-5 pb-2">
          <Button variant="secondary" onClick={() => router.push("/home")}>
            กลับหน้าหลัก
          </Button>
        </div>
      }
      className="flex flex-col items-center justify-center gap-2 px-8 text-center"
    >
      <p className="text-title-sm">{title}</p>
      <p className="text-body text-gray">{errorMessage(error)}</p>
    </AppShell>
  );
}
