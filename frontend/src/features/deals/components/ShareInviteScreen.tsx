"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { useDeal, useSendInvite } from "../hooks";
import { ShareInviteView } from "./ShareInviteView";

/** /deals/[id]/share — L4 */
export function ShareInviteScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal } = useDeal(id);
  const sendInvite = useSendInvite();

  if (!deal) return <ScreenSkeleton />;

  // Phase 7: ใช้ invite.qrUrl จาก server (token จริง) — ตอนนี้ใช้ลิงก์รหัสดีล
  const inviteUrl = deal.invite?.qrUrl ?? `${window.location.origin}/invites/${deal.shareCode}`;

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
