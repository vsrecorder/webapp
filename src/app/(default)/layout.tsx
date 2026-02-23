import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { GoogleAnalytics } from "@next/third-parties/google";

import Layout from "@app/components/templates/Layout";

/*
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
*/

const domain = process.env.VSRECORDER_DOMAIN;

const gaId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  ? process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  : "";

export const metadata: Metadata = {
  metadataBase: new URL(`https://` + domain),
  title: "バトレコ - ポケカ対戦記録作成・共有サービス",
  description: "ポケモンカードゲームの対戦記録を作成・共有できるWebサービス",
  openGraph: {
    url: "/",
    type: "website",
    title: "バトレコ - ポケカ対戦記録作成・共有サービス",
    images: `/images/icon.png`,
    description: "ポケモンカードゲームの対戦記録を作成・共有できるWebサービス",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    site: "@vsrecorder_mobi",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="overflow-x-hidden">
        <GoogleAnalytics gaId={gaId} />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
