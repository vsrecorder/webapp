import dynamic from "next/dynamic";

import { auth } from "@app/auth";

import Providers from "@app/components/organisms/Layout/Providers";

import Header from "@app/components/organisms/Layout/Header";
import Navigation from "@app/components/organisms/Layout/Navigation";
import AddToHomeScreenBanner from "@app/components/molecules/PWA/AddToHomeScreenBanner";
import ServiceWorkerRegister from "@app/components/molecules/PWA/ServiceWorkerRegister";
import { isDevEnv } from "@app/utils/appIcon";

// dev ツールインジケーターをスマホでドラッグ可能にする回避策(開発時のみ)。
//
// 静的 import にすると、描画を条件分岐で止めてもクライアント参照が生成され、
// 本番のクライアントバンドルとルートごとの client-reference-manifest に載ってしまう。
// NODE_ENV はビルド時に定数化されるため、動的 import をこの形で書くと
// 本番では枝ごと消えてチャンク自体が生成されない。
const DevToolsDragFix =
  process.env.NODE_ENV !== "production"
    ? dynamic(() => import("@app/components/molecules/DevToolsDragFix"))
    : null;

export default async function TemplateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  // ホーム画面追加バナーはmanifest.tsのPWAアイコンと同じローカルファイルを使う
  const homeScreenIconUrl = isDevEnv() ? "/icon_dev-192x192.png" : "/icon-192x192.png";

  return (
    <Providers>
      <div className="flex">
        <Navigation />

        {/* min-w-0: 横方向flex内の子はデフォルトで内容量ぶんの最小幅を持つため、
            ページ内に横方向へはみ出すコンテンツ（横スクロールリストなど）があると
            この幅がページ全体を押し広げてレイアウトが崩れる。min-w-0で明示的に解除する */}
        <div className={`flex flex-col flex-1 min-w-0 ${session ? "lg:pl-56" : ""}`}>
          <Header />

          {/* デスクトップ(lg以上)はタブレット(md)より左右余白を絞り、コンテンツ側で幅を広く使えるようにする。
              下余白は下部ナビ(MobileNavigation)の実寸に合わせる: 本体 h-17(4.25rem) + safe-area の
              下端余白。lg以上は下部ナビが消えるので lg:pb-6 に戻す。
              ナビの高さを変えるときはここも合わせて更新すること */}
          <main className={`app-dot-bg flex-1 p-2 pt-14 lg:pt-28 lg:pb-6 min-h-svh w-full ${session ? "md:px-32 lg:px-12 xl:px-20 2xl:px-32 pb-[calc(4.25rem+env(safe-area-inset-bottom))]" : "pb-2"}`}>
            {children}
          </main>
        </div>
      </div>

      <AddToHomeScreenBanner iconUrl={homeScreenIconUrl} />
      <ServiceWorkerRegister />
      {DevToolsDragFix && <DevToolsDragFix />}
    </Providers>
  );
}
