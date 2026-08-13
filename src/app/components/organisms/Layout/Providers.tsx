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
            {/* ToastProviderはポータルせず、その場にトースト領域(z-100)を描画する。
                モーダル(z-50、body末尾へポータル)より前面に出すには、この領域が
                position:fixed な祖先のstacking contextに閉じ込められないことが必要。
                そのため useModalBackgroundScrollLock がモーダル表示中に固定する
                data-scroll-lock-root の外(兄弟)に置く。
                body直下(HeroUIProviderの外)へ出す形は、実機iOSでトーストが
                表示されなくなったため採らない */}
            <ToastProvider placement={"top-center"} />
            {/* モーダル表示中の背面スクロール対策(useModalBackgroundScrollLock)が
                position:fixed で固定する対象。トースト領域を含むアプリルート全体を
                固定すると、fixedが作るstacking contextにトーストのz-100が閉じ込められ
                モーダルの背後に描画されてしまうため、トースト領域を除いた
                ページ内容だけをこのラッパーで括って固定対象にする */}
            <div data-scroll-lock-root="">{children}</div>
          </UserAvatarProvider>
        </NextThemesProvider>
      </HeroUIProvider>
    </SessionProvider>
  );
}
