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
      {/* locale="ja-JP": DatePicker等の日付表示順を年/月/日にし、カレンダーを日本語化する */}
      <HeroUIProvider locale="ja-JP">
        {/* 手動トグル方式: classで.darkを付与、初期値はライト、OS設定には連動しない */}
        {/* disableTransitionOnChange: 切替の瞬間だけ全要素のトランジションを止め、
            要素ごとの変化タイミングのズレ（ちらつき）を防いで一斉に切り替える */}
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
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
