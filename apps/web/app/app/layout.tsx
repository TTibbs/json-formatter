import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "JSON Transform Workbench",
  description:
    "Transform JSON with a declarative DSL — paste input, write a transform, see output live.",
};

export default function WorkbenchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </div>
  );
}
