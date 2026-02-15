import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Vibe Fran\u00e7ais B2",
  description: "\u00c9dito B2 \u5b66\u4e60\u5e73\u53f0 \u2014 \u8bcd\u6c47\u3001\u8bed\u6cd5\u3001\u53e3\u8bed\u3001\u5199\u4f5c\u3001\u6a21\u8003",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
