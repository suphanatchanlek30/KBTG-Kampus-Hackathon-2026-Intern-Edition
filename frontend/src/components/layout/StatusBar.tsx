// Status bar ปลอม 9:41 — แสดงเฉพาะในกรอบโทรศัพท์ (Figma: 393×50 · pad 8/28/0/36)
export function StatusBar() {
  return (
    <div aria-hidden className="hidden h-[50px] shrink-0 items-center justify-between pt-2 pr-7 pl-9 framed:flex">
      <span className="text-header font-semibold">9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.7" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.7" />
          <rect x="10" y="3" width="3" height="9" rx="0.7" />
          <rect x="15" y="0" width="3" height="12" rx="0.7" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <path d="M8.5 2.4c2.3 0 4.4.9 6 2.4l1.1-1.1A10 10 0 0 0 8.5.8 10 10 0 0 0 1.4 3.7l1.1 1.1a8.5 8.5 0 0 1 6-2.4Z" />
          <path d="M8.5 5.6c1.4 0 2.7.5 3.7 1.4l1.1-1.1a6.8 6.8 0 0 0-9.6 0L4.8 7a5.4 5.4 0 0 1 3.7-1.4Z" />
          <path d="M8.5 8.8c.6 0 1.1.2 1.5.6L8.5 11 7 9.4c.4-.4.9-.6 1.5-.6Z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" strokeOpacity="0.45" />
          <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
          <path d="M25 4.5v4a2 2 0 0 0 0-4Z" fill="currentColor" fillOpacity="0.45" />
        </svg>
      </div>
    </div>
  );
}
