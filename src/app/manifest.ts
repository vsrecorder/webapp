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
    // background_color は PWA 起動スプラッシュの地色。**アイコン画像の地色に合わせる**こと。
    // ここをアイコンの地色からズラすと、アイコンの外形(OS スプラッシュでは円マスク、Chrome の
    // スプラッシュでは角丸四角)が地色との段差として浮かび上がり、2枚のスプラッシュが切り替わる
    // 瞬間に「丸が四角に変わって縮む」ように見える。値は icon-*.png / maskable_icon_*.png の
    // 縦中央の地色(グラデーションの中間色)。アイコンを描き直したらこの値も測り直す。
    background_color: env == "dev" ? "#FB7A06" : "#0779F6",
    // theme_color はアプリ表示中のステータスバー色。ヘッダーのグラデーション始点
    // (本番は blue-600)に合わせる。dev環境は一目で区別できるようオレンジにする
    theme_color: env == "dev" ? "#EA580C" : "#2563EB",
    // purpose:"any" のアイコンは Chrome の起動スプラッシュで 128dp の四角として描かれるのに対し、
    // purpose:"maskable" は Android 12 以降の OS スプラッシュで「240dp 枠の中央・直径 160dp の円」に
    // マスクして描かれる。同じ絵柄を同じ余白で置くと、ロゴの実効サイズが約 76dp と約 103dp に食い違い、
    // 先に出る OS スプラッシュから Chrome のスプラッシュへ移る瞬間にロゴが縮んで見える。
    // そのため any 側は、ロゴを枠いっぱい(占有率 約80%)まで寄せた splash_icon-*.png を専用に用意し、
    // maskable 側の実効サイズ(約103dp)と揃えている。maskable の余白は円マスクで切られないための
    // ものなので詰められない。片方だけ差し替えるとまたズレるため、両者は必ずセットで見直すこと。
    // アプリ内のロゴ表示(OGP画像・シェア画像・PWAバナー)は従来どおり icon-*.png を使う。
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
              src: "/maskable_icon_dev_x512.png",
              sizes: "512x512",
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
              src: "/maskable_icon_x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
  };
}
