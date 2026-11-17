import type { Metadata } from "next";
import "./globals.css";
import { LivePlatformProvider } from "@/lib/demo/store";

export const metadata: Metadata = {
  title: "Interview Schedule — Live Placement & Interview Queue Platform",
  description:
    "Real-time university placement & recruitment interview scheduling engine with live ETA propagation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LivePlatformProvider>{children}</LivePlatformProvider>
      </body>
    </html>
  );
}
