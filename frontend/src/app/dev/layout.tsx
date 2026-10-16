import { notFound } from "next/navigation";

// หน้า /dev/* ใช้ตอนพัฒนาเท่านั้น — production build ตอบ 404
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
