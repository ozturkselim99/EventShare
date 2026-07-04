import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kadrajım — Etkinlik Fotoğraf Paylaşımı",
  description:
    "Misafirleriniz QR kodu tarayarak fotoğraf ve video yüklesin. Uygulama gerekmez, tüm anılar tek galeride.",
  openGraph: {
    title: "Kadrajım — Etkinlik Fotoğraf Paylaşımı",
    description:
      "QR kod ile kolay fotoğraf paylaşımı. Düğün, parti ve kurumsal etkinlikler için.",
    siteName: "Kadrajım",
    locale: "tr_TR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Cormorant:ital,wght@0,300;0,400;1,300;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F8F5F0] text-[#1D1D1D] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
