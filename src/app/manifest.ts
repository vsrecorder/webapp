import type { MetadataRoute } from "next";

// manifest.ts もビルド時に静的生成されるため、実行時にしか渡らない ENV が undefined のまま
// 焼き込まれ、dev環境でも本番の名前・アイコンが配信されてしまう。リクエスト時に評価させる。
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const env = process.env.ENV;

  return {
    // name は Chrome の起動スプラッシュでアイコンの下に表示される。長いと折り返して
    // 複数行になり、その分アイコンが画面中央より上へ押し上げられる。Android 12 以降は
    // OS のスプラッシュ(アイコンだけを画面中央に表示)が先に出るため、押し上げ量がそのまま
    // 2枚のスプラッシュ間でのロゴの位置ズレになる。1行に収まる長さにすること。
    // サービスの説明は description が持つ。
    name: env == "dev" ? "開発版バトレコ" : "バトレコ",
    short_name: env == "dev" ? "開発版バトレコ" : "バトレコ",
    description: "ポケカプレイヤーのための対戦記録サービス",
    start_url: "/",
    display: "standalone",
    // background_color は PWA 起動スプラッシュの地色。**manifest 用アイコンの地色と完全に同じ値**
    // にすること。ここがズレると、アイコンの外形(OS スプラッシュでは直径 160dp の円、Chrome の
    // スプラッシュでは 128dp の四角)が地色との段差として浮かび上がり、2枚のスプラッシュが
    // 切り替わる瞬間に「丸が四角に変わって縮む」ように見える。
    // splash_icon-*.png / maskable_icon_*.png は、この値の単色を地色にしてある(下の icons 参照)。
    background_color: env == "dev" ? "#FB7A06" : "#0779F6",
    // theme_color はアプリ表示中のステータスバー色。ヘッダーのグラデーション始点
    // (本番は blue-600)に合わせる。dev環境は一目で区別できるようオレンジにする
    theme_color: env == "dev" ? "#EA580C" : "#2563EB",
    /*
     * Android の PWA 起動では、ロゴ画面が2枚続けて出る。
     *   1. OS スプラッシュ(Android 12 以降) … purpose:"maskable" を「240dp 枠の中央・
     *      直径 160dp の円」にマスクして描く
     *   2. Chrome スプラッシュ … purpose:"any" を 128dp の四角として描く
     * 見た目が食い違っていると、1 から 2 へ移る瞬間に「ロゴがもう一度描き直された」ように見える。
     * ページ側では何も起きていないので、揃えるべき条件はこの manifest とアイコン画像だけで決まる。
     *
     * 揃えるのは次の3つ。どれか1つでも崩れると再発する。
     *
     * (a) ロゴの実効サイズ … 同じ絵柄を同じ余白で置くと 約76dp と 約103dp に食い違う。
     *     any 側はロゴを枠いっぱい(占有率 約80%)に寄せた splash_icon-*.png を専用に用意し、
     *     maskable 側(占有率 約43% → 240dp×0.43 = 約103dp)と揃えてある。maskable の余白は
     *     円マスクで切られないためのものなので詰められない。動かすのは常に any 側。
     *
     * (b) 地色 … **両者とも background_color と同じ単色**にしてある。グラデーションが載っていると、
     *     円(直径 160dp)と四角(128dp)という外形の違いがそのまま地色の段差として見え、
     *     ロゴ自体が同じ位置・同じ大きさでも「淡い円が小さい四角に変わる」動きになる
     *     (2026-09-08 の実測: 円の下端で G が背景 -19、四角の下端で -11 と差があった)。
     *     アイコンを描き直すときも、この2枚だけは地色を単色に潰すこと。
     *
     * (c) ロゴの解像感 … maskable は 240dp 枠ぶんに拡大されるため、画像内のロゴが小さいと
     *     引き伸ばされてボケ、シャープな any 側と並べたときに差が出る。maskable だけ
     *     1024x1024 を用意してあるのはこのため(1024×0.43 = 440px を 720px 枠へ縮小して描く)。
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
