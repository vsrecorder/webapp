import type { MetadataRoute } from "next";

import { getSplashBackgroundColor } from "@app/utils/pwaColors";

// manifest.ts もビルド時に静的生成されるため、実行時にしか渡らない ENV が undefined のまま
// 焼き込まれ、dev環境でも本番の名前・アイコンが配信されてしまう。リクエスト時に評価させる。
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const env = process.env.ENV;
  const splashColor = getSplashBackgroundColor();

  return {
    // name は Chrome がスプラッシュを自前で描く経路(下記の予備経路)でアイコンの下に表示される。
    // 長いと折り返して複数行になり、その分アイコンが中央より上へ押し上げられるので 1 行に収める。
    // サービスの説明は description が持つ。
    name: env == "dev" ? "開発版バトレコ" : "バトレコ",
    short_name: env == "dev" ? "開発版バトレコ" : "バトレコ",
    description: "ポケカプレイヤーのための対戦記録サービス",
    start_url: "/",
    // id はブラウザがインストール済みアプリを見分ける鍵。省略すると start_url が代わりに
    // 使われるため、将来 start_url を変えた瞬間に「別のアプリ」と判定され、ホーム画面に
    // 追加済みのものとは別のアイコンが増える(既存の WebAPK は更新されず取り残される)。
    // start_url と独立させておけば、行き先を変えても同じアプリのままでいられる。
    id: "/",
    display: "standalone",
    /*
     * Android の PWA 起動画面の仕組み(2026-09-09 の実機動画をフレーム解析して確定)
     *
     * ホーム画面のアイコンをタップすると次の順で画面が出る。Android 12 以降の OS スプラッシュは
     * WebAPK シェルが半透明テーマ(windowIsTranslucent)で無効化しているので出ない。
     *   1. WebAPK シェル自身のスプラッシュ … maskable アイコンを 240dp の枠に等倍で置き
     *      (ロゴ実測 308px = 1024px 中 43% × 720px)、ステータスバーとナビゲーションバーの間
     *      (コンテンツ領域)の中央に描く。ステータスバーは theme_color、ナビゲーションバーは
     *      シェルのテーマ既定の黒。
     *   2. Chrome のスプラッシュ … 1 のスクリーンショットを受け取り、半透明のウィンドウを 1 の
     *      上に重ねて全画面(edge-to-edge)の中央に FIT_CENTER で描く。絵は同じだが、コンテンツ
     *      領域の中心と画面の中心の差 (ステータスバー高 - ナビバー高)/2(実測 29px)だけロゴが
     *      上に来て、バーの領域も地色で塗られる。
     *   3. ページの初回描画 → Chrome がスプラッシュを 300ms でフェードアウト。
     *
     * 「起動画面が揺らぐ」の正体は 2→3 の境目。Chrome は半透明を解除する際に
     * Window#setFormat(PixelFormat.TRANSPARENT) を呼び(SplashController#hideSplash)、
     * 描画バッファが作り直される 1 フレームだけ下敷きの 1 が露出する。動画では 1 フレーム
     * (17ms)だけロゴが 29px 下がり、ステータスバーが theme_color、ナビゲーションバーが黒に
     * なって元に戻っていた。ページ側では何も起きていない(GET / は 1 本)。
     *
     * ページから動かせるのは theme_color だけ。1 のステータスバーが 2 の地色と揃うよう
     * background_color と同じ値にしてある(アプリ表示中のステータスバー色は layout.tsx が
     * Android の standalone 表示に限って <meta name="theme-color"> でヘッダー色にする)。
     * ロゴの 29px のずれと黒いナビゲーションバーは Chrome とシェルの実装で決まり、
     * manifest からは変えられない。
     */
    background_color: splashColor,
    theme_color: splashColor,
    /*
     * アイコンについて。上の経路では 2 が 1 のスクリーンショットなので、ロゴの絵柄・大きさは
     * 自動的に一致する。ただしスクリーンショットの受け渡しに失敗した場合や旧式の WebAPK では
     * Chrome が purpose:"any" のアイコンを 128dp の四角で描き直す(予備経路)ので、
     * シェル側(maskable を 240dp 枠に描く)と見た目が揃うように次の 3 つを維持している。
     *
     * (a) ロゴの実効サイズ … 同じ絵柄を同じ余白で置くと 約76dp と 約103dp に食い違う。
     *     any 側はロゴを枠いっぱい(占有率 約80%)に寄せた splash_icon-*.png を専用に用意し、
     *     maskable 側(占有率 約43% → 240dp×0.43 = 約103dp)と揃えてある。maskable の余白は
     *     ランチャーの円マスクで切られないためのものなので詰められない。動かすのは常に any 側。
     *
     * (b) 地色 … **両者とも background_color と同じ単色**にしてある。グラデーションが載っていると、
     *     240dp の四角(シェル)と 128dp の四角(予備経路)という外形の違いがそのまま地色の段差と
     *     して見え、ロゴ自体が同じ位置・同じ大きさでも「淡い四角が小さい四角に変わる」動きになる。
     *     アイコンを描き直すときも、この 2 枚だけは地色を単色に潰すこと。
     *
     * (c) ロゴの解像感 … maskable は 240dp 枠(density 3 で 720px)に描かれるため、画像内のロゴが
     *     小さいと引き伸ばされてボケる。maskable だけ 1024x1024 を用意してあるのはこのため
     *     (1024×0.43 = 440px を 720px 枠へ縮小して描く)。
     *     192 は低密度端末のランチャー用で、起動スプラッシュには選ばれない。
     *
     * アプリ内のロゴ表示(OGP画像・シェア画像・PWAバナー)は従来どおり icon-*.png を使う。
     * こちらはグラデーションのままでよく、manifest 用と兼用にしないこと。
     */
    icons:
      env == "dev"
        ? [
            {
              src: "/splash_icon_dev-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/splash_icon_dev-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/maskable_icon_dev_x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/maskable_icon_dev_x1024.png",
              sizes: "1024x1024",
              type: "image/png",
              purpose: "maskable",
            },
          ]
        : [
            {
              src: "/splash_icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/splash_icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/maskable_icon_x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "/maskable_icon_x1024.png",
              sizes: "1024x1024",
              type: "image/png",
              purpose: "maskable",
            },
          ],
  };
}
