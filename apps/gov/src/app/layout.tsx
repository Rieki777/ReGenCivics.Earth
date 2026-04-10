import type { Metadata, Viewport } from "next";
import { PrivyProviderWrapper } from "@/providers/PrivyProviderWrapper";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReGen Gov",
  description: "Governance dashboard for the Regenerative Renaissance. Coordinate, deliberate, decide.",
  icons: [{ rel: "icon", url: "/regen-gov-icon.svg" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d2818",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PrivyProviderWrapper>
          <div className="flex min-h-screen">
            <DesktopSidebar />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
          </div>
          <MobileNav />
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}
