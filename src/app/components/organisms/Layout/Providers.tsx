"use client";

import { SessionProvider } from "next-auth/react";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { UserAvatarProvider } from "@app/contexts/UserAvatarContext";
import SessionWatcher from "@app/components/organisms/Layout/SessionWatcher";
import DailyActivityBeacon from "@app/components/organisms/Layout/DailyActivityBeacon";
import VisualViewportOffsetSync from "@app/components/organisms/Layout/VisualViewportOffsetSync";
import ModalBackgroundScrollLock from "@app/components/organisms/Layout/ModalBackgroundScrollLock";
import CloseModalOnBack from "@app/components/organisms/Layout/CloseModalOnBack";
import ScrollResetOnNavigation from "@app/components/organisms/Layout/ScrollResetOnNavigation";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // refetchInterval: 他端末での退会等によるセッション失効を
    // 画面を開いたままでも検知できるよう、5分ごとにセッションを再検証する。
    // これより短くしてもバックエンドへの疎通確認自体はauth.tsのUSER_CHECK_CACHE_MS(30分)
    // でキャッシュされるため、退会の反映が早くなるわけではない。
    // refetchWhenOffline: 未指定だとオフライン中もポーリングし続けて必ず失敗するため、
    // 明示的にfalseを指定してオフライン時は問い合わせないようにする。
    <SessionProvider refetchInterval={300} refetchWhenOffline={false}>
      <SessionWatcher />
      <DailyActivityBeacon />
      <VisualViewportOffsetSync />
      <ModalBackgroundScrollLock />
      <CloseModalOnBack />
      <ScrollResetOnNavigation />
      {/* ToastProviderはポータルせず、その場にトースト領域(z-100)を描画する。
          HeroUIProviderの内側に置くとアプリルート(body > [data-overlay-container])の
          内側に入り、モーダル表示中にuseModalBackgroundScrollLockがアプリルートを
          position:fixed化した際にstacking contextへ閉じ込められて、モーダル(z-50、
          body末尾へポータル)より背後に描画されてしまう。そのためHeroUIProviderの
          外に置き、トースト領域をbody直下(アプリルートの外)に出す。
          トーストのキューはモジュールグローバルなので、プロバイダの外でもaddToastは動く */}
      <ToastProvider placement={"top-center"} />
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
            {children}
          </UserAvatarProvider>
        </NextThemesProvider>
      </HeroUIProvider>
    </SessionProvider>
  );
}
