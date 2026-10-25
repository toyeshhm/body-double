import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { StickerDefs } from "@/components/ui/StickerDefs";
import "./globals.css";

// Fraunces carries the storybook voice (titles, foil code, italic narration); Figtree keeps answers and UI plain and fair.
const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display",
});
const ui = Figtree({ subsets: ["latin"], variable: "--font-ui" });

export const metadata: Metadata = {
  title: "Body Double",
  description: "A fairy-tale party game where the Wolf learns to wear your friends' words.",
};

export const viewport: Viewport = {
  themeColor: "#eadfc7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>
        <StickerDefs />
        {children}
      </body>
    </html>
  );
}
