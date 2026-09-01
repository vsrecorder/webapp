import dynamic from "next/dynamic";

import { auth } from "@app/auth";

import Providers from "@app/components/organisms/Layout/Providers";

import Header from "@app/components/organisms/Layout/Header";
import Navigation from "@app/components/organisms/Layout/Navigation";
import PwaBanners from "@app/components/molecules/PWA/PwaBanners";
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
    <Providers session={session}>
      <div className="flex">
        <Navigation />

        {/* min-w-0: 横方向flex内の子はデフォルトで内容量ぶんの最小幅を持つため、
            ページ内に横方向へはみ出すコンテンツ（横スクロールリストなど）があると
            この幅がページ全体を押し広げてレイアウトが崩れる。min-w-0で明示的に解除する */}
        <div className={`flex flex-col flex-1 min-w-0 ${session ? "lg:pl-56" : ""}`}>
          <Header />

          {/* 左右余白は画面が広がるほど増やす。かつて md(768px〜)だけ px-32(128px)にしていたが、
              各ページのコンテンツは lg 未満で max-w-2xl(672px)に制限されるため、
              768〜1023px では「余白128px + 上限672px」が二重にかかって実効幅が512〜578pxまで潰れ、
              それより狭い iPad mini(744px・余白8px→実効672px)を下回っていた
              (画面が広いほどコンテンツが狭くなる逆転)。md も lg と同じ px-12 に揃えて解消する。
              下余白は下部ナビ(MobileNavigation)の実寸に合わせる: 本体(--mobile-nav-height) +
              safe-area の下端余白。lg以上は下部ナビが消えるので lg:pb-6 に戻す。
              ナビの高さは globals.css の --mobile-nav-height で決まる(Androidのみ低い) */}
          <main className={`app-dot-bg flex-1 p-2 pt-14 lg:pt-28 lg:pb-6 min-h-svh w-full ${session ? "md:px-12 xl:px-20 2xl:px-32 pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))]" : "pb-2"}`}>
            {children}
          </main>
        </div>
      </div>

      {/* 画面下部のバナー2枚(ホーム画面に追加 / Web Push の soft ask)。
          同じ位置に出るので、重ねずにどちらを出すかは PwaBanners が決める */}
      <PwaBanners iconUrl={homeScreenIconUrl} userId={session?.user.id ?? null} />
      <ServiceWorkerRegister />
      {DevToolsDragFix && <DevToolsDragFix />}
    </Providers>
  );
}
