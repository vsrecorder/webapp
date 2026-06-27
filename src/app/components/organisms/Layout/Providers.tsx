"use client";

import { SessionProvider } from "next-auth/react";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { UserAvatarProvider } from "@app/contexts/UserAvatarContext";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <HeroUIProvider>
        {/* 手動トグル方式: classで.darkを付与、初期値はライト、OS設定には連動しない */}
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <UserAvatarProvider>
            <ToastProvider placement={"top-center"} />
            {children}
          </UserAvatarProvider>
        </NextThemesProvider>
      </HeroUIProvider>
    </SessionProvider>
  );
}
