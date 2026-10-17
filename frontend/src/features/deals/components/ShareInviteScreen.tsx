"use client";

import { useParams, useRouter } from "next/navigation";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { ScreenSkeleton } from "@/components/layout/ScreenSkeleton";
import { toast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/api/errors";
import { findVisible, saveImage } from "@/lib/export-image";
import { lookupTenant } from "../api";
import { useDeal, useSendInvite } from "../hooks";
import { ShareInviteView } from "./ShareInviteView";

/** Handles the invite-sharing route. */
export function ShareInviteScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: deal, error } = useDeal(id);
  const sendInvite = useSendInvite();

  if (error && !deal) return <ErrorScreen error={error} />;

  if (!deal) return <ScreenSkeleton />;

  const inviteUrl = `${window.location.origin}/invites/${deal.shareCode}`;

  return (
    <ShareInviteView
      deal={deal}
      inviteUrl={inviteUrl}
      sending={sendInvite.isPending}
      onClose={() => router.replace("/home")}
      onLookup={async (phone) => (await lookupTenant(phone)).shortName}
      onSaveQr={async () => {
        const node = findVisible('[data-export="qr"]');
        if (!node) return;
        try {
          if ((await saveImage(node, `ksure-qr-${deal.shareCode}.png`)) === "downloaded")
            toast.success("บันทึก QR แล้ว");
        } catch (err) {
          toast.error(errorMessage(err));
        }
      }}
      onSend={(phone) =>
        sendInvite.mutate(
          { id: deal.id, phone },
          {
            onSuccess: (res) => {
              toast.success(`ส่งคำขอให้ ${res.sentTo.shortName} แล้ว`);
              router.replace(`/deals/${deal.id}`);
            },
          },
        )
      }
    />
  );
}
