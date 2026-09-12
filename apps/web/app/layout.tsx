import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "../components/providers";

export const metadata: Metadata = {
  title: "LATCH — Verifiable Authority for Autonomous AI Workers",
  description:
    "Identity for AI agents. Bounded organizational authority, confidential policy enforcement, and fail-closed execution on ENSv2 and Chainlink CRE.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark antialiased">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-black text-foreground font-sans overflow-x-hidden selection:bg-[#4efa94]/20 selection:text-[#4efa94]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
