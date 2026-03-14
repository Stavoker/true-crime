import type { Metadata, Viewport } from "next";
import "./globals.css";
import MusicToggle from "@/components/MusicToggle";

export const metadata: Metadata = {
  title: "Детектив — Гра про злочин",
  description: "Розслідуй вбивство, допитуй підозрюваних і знайди вбивцю.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className="min-h-screen antialiased">
        <MusicToggle />
        {children}
      </body>
    </html>
  );
}
