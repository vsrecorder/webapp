import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js 16 で `next lint` が廃止され、ESLint CLI を直接叩く形になった。
// eslint-config-next も flat config 前提のサブパスエクスポートに変わったため、
// FlatCompat(@eslint/eslintrc)経由で "next/core-web-vitals" を extends する
// 旧来の書き方では解決できない。ここでは flat config をそのまま spread する。
//
// 除外パス(.next/** out/** build/** next-env.d.ts)は nextVitals 側が既定で持つ。
// 独自の除外を足すときは globalIgnores() で既定分も含めて書き直す必要がある。
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // files は eslint-config-next 側で react-hooks プラグインを定義している
    // config オブジェクトと同じパターンに揃える。ここがずれると
    // 「plugin is not defined in your configuration file」で落ちる。
    // (いまは上書きするルールが無いが、次に降格が要るときの置き場として残す)
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    // eslint-config-next@16 が eslint-plugin-react-hooks を 5系→7系へ上げたことで、
    // React Compiler 由来のルール群が新たに error として有効になった。
    // 既存コードに対して165件出たが、いずれも「今まで通っていたものが壊れた」のではなく
    // 「これまで検査されていなかった観点が増えた」もの。
    //
    // 2026-08-28 に下記を個別に潰した(再発防止のため error のまま):
    //   preserve-manual-memoization  8件 → deps の optional chaining をローカル定数に退避
    //   purity                       4件 → JST現在時刻の式を既存の getJstNow() に集約
    //   immutability                 4件 → props の書き換えを廃止(2件)/ ref コールバックは誤検知
    //   static-components            1件 → iconForKey は react-icons の実体を返すだけ(誤検知)
    //   exhaustive-deps              7件 → 依存を正しく列挙。二重起動ガードは state から ref へ
    //   no-location-assign-…         2件 → セッション確立のため意図的なフルロード(誤検知)
    // 誤検知だったものは該当行に理由付きの eslint-disable-next-line を置いてある。
    //
    // 2026-09-08 に残りも潰し、warning への降格をやめた(0件):
    //   set-state-in-effect        116件
    //     - マウント後のブラウザ判定(UA・PWA・画面幅)      → useClientValue(useSyncExternalStore)
    //     - localStorage / sessionStorage の読み取り      → useLocalStorageItem / useSessionStorageItem
    //                                                     (書き込みは utils/*StorageStore 経由で通知)
    //     - props や取得結果が変わったときの state のリセット → 前回値を state に控えて描画中に更新する
    //                                                     (React 公式の「前回の描画の情報を保存する」)
    //     - key → fetch → data/loading/error のローダー      → useSeededResource
    //     - 入力から導ける値(有効・無効の判定など)          → state をやめて描画中に計算
    //     - 無限スクロールの「読み込み中」                  → 条件から導き、effect は取得だけを担う
    //   refs                        21件
    //     - 最新の props を ref に持たせる                  → 描画中ではなく effect で追随
    //     - chart.js プラグインへ最新 state を渡す         → ref ではなくデータセットの独自プロパティ
    //
    // なお rules-of-hooks(本来のフック規則)の違反は0件。
    rules: {},
  },
]);

export default eslintConfig;
