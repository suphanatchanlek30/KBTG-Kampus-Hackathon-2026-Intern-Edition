import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai, Poppins } from "next/font/google";
import { brand } from "@/config/brand";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

// Poppins ไม่ใช่ variable font ต้องระบุ weight · ตัวเลข/อังกฤษใช้ Poppins ส่วนไทย fallback ไป Noto Sans Thai
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: brand.name,
  description: `${brand.tagline} — ${brand.disclaimer}`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0B",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${poppins.variable} ${notoThai.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
