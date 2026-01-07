import type { ReactNode } from "react";
import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Party Fowl — Home",
  description:
    "Party Fowl homepage with responsive slides, layered frames, and immersive docking controls.",
  icons: {
    icon: [
      "/assets/favicon/favicon-32x32.png",
      "/assets/favicon/favicon-16x16.png",
    ],
    shortcut: "/assets/favicon/favicon-32x32.png",
    apple: "/assets/favicon/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="/scripts/slides.js"
          strategy="afterInteractive"
          id="partyfowl-slides"
        />
        <Script
          src="/scripts/layout.js"
          strategy="afterInteractive"
          id="partyfowl-layout"
        />
      </body>
    </html>
  );
}
