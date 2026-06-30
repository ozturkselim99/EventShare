import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventShare",
  description: "Anılarını paylaş, birlikte hatırla.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
