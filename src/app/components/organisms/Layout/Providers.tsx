"use client";

import { SessionProvider } from "next-auth/react";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { UserAvatarProvider } from "@app/contexts/UserAvatarContext";
import SessionWatcher from "@app/components/organisms/Layout/SessionWatcher";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // refetchInterval: 他端末での退会等によるセッション失効を
    // 画面を開いたままでも検知できるよう、定期的にセッションを再検証する
    // TODO: 不具合ありなので後で調査 勝手にログアウトされる
    //<SessionProvider refetchInterval={60}>

    <SessionProvider>
      <SessionWatcher />
      {/* locale="ja-JP": DatePicker等の日付表示順を年/月/日にし、カレンダーを日本語化する */}
      <HeroUIProvider locale="ja-JP">
        {/* OS連動方式: classで.darkを付与し、既定では端末（OS）のライト/ダーク設定に
            自動追従する。手動トグルで切り替えた場合はその選択を保存して優先する。 */}
        {/* disableTransitionOnChange: 切替の瞬間だけ全要素のトランジションを止め、
            要素ごとの変化タイミングのズレ（ちらつき）を防いで一斉に切り替える */}
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
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
