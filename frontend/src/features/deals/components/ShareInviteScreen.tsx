"use client";

import { useParams, useRouter } from "next/navigation";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { useDeal, useSendInvite } from "../hooks";
import { ShareInviteView } from "./ShareInviteView";

/** /deals/[id]/share — L4 */
export function ShareInviteScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);
  const sendInvite = useSendInvite();

  if (error && !deal) return <ErrorScreen error={error} />;

  if (!deal) return <ScreenSkeleton />;

  // QR = ลิงก์รหัสดีลบน origin ที่เปิดอยู่ (ใช้ได้ทั้ง localhost / IP ในวง LAN / tunnel)
  // ไม่ใช้ invite.qrUrl เพราะ server ส่ง token มาแค่ตอนสร้างดีล (ไม่ได้เก็บ) และใช้ APP_BASE_URL ซึ่งอาจไม่ใช่ที่อยู่ที่มือถือเปิดได้
  // รหัสดีลใช้ได้เฉพาะผู้เช่าที่ล็อกอินแล้ว และ server จำกัดความถี่การเปิด (docs/03-architecture.md §4)
  const inviteUrl = `${window.location.origin}/invites/${deal.shareCode}`;

  return (
    <ShareInviteView
      deal={deal}
      inviteUrl={inviteUrl}
      sending={sendInvite.isPending}
      onClose={() => router.replace("/home")}
      onSend={() =>
        sendInvite.mutate(deal.id, {
          onSuccess: (res) => {
            toast.success(`ส่งคำขอให้ ${res.sentTo.shortName} แล้ว`);
            router.replace(`/deals/${deal.id}`);
          },
        })
      }
    />
  );
}
