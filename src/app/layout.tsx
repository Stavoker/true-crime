import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Детектив — Гра про злочин",
  description: "Розслідуй вбивство, допитуй підозрюваних і знайди вбивцю.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
