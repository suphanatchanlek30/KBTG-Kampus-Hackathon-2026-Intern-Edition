"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "./Toast";

/** รหัสดีล + ปุ่มคัดลอก (Figma L4: 321×46 r14 bg #0A0A0B · pad 0/14 · gap 10 · รหัส 16/600 ls 2) */
export function CodeField({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("คัดลอกแล้ว");
    } catch {
      toast.error("คัดลอกไม่ได้ — กดค้างที่รหัสเพื่อคัดลอกเอง");
    }
  };

  return (
    <div className="flex h-[46px] items-center gap-2.5 rounded-tile bg-ink px-3.5">
      <span className="text-caption text-muted">{label}</span>
      <span className="flex-1 text-code select-all">{code}</span>
      <button type="button" onClick={copy} aria-label={`คัดลอก${label}`} className="text-neon">
        {copied ? <Check size={16} strokeWidth={1.8} /> : <Copy size={16} strokeWidth={1.5} />}
      </button>
    </div>
  );
}
