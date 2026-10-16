import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { DemoTools } from "@/features/demo/DemoTools";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <PhoneFrame aside={<DemoTools />}>{children}</PhoneFrame>;
}
