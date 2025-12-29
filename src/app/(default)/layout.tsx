import type { Metadata } from "next";
//import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

import Header from "./components/Layout/Header";
import Navigation from "./components/Layout/Navigation/Navigation";

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

export const metadata: Metadata = {
  title: "バトレコ β版",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="overflow-x-hidden">
        <Providers>
          <div className="flex">
            <Navigation />

            <div className="flex flex-col flex-1 lg:ml-72">
              <Header />

              <main
                style={{
                  backgroundImage: "radial-gradient(#dee5ea 1.2px, transparent 1.2px)",
                  backgroundSize: "24px 24px",
                  //backgroundColor: "#f5fbff",
                  //backgroundColor: "#f5faff",
                  //backgroundColor: "#f7fbff",
                  backgroundColor: "#fafcff",
                }}
                className="flex-1 p-6 pt-14 lg:pt-16 lg:pb-6 min-h-svh min-w-svw max-w-svw"
              >
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
