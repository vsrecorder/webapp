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
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    // eslint-config-next@16 が eslint-plugin-react-hooks を 5系→7系へ上げたことで、
    // React Compiler 由来のルール群が新たに error として有効になった。
    // 既存コードに対して165件出たが、いずれも「今まで通っていたものが壊れた」のではなく
    // 「これまで検査されていなかった観点が増えた」もの。Next.js 16 化とは独立した
    // リファクタ課題なので、ここで warning に落として lint を実用可能な状態に保っている。
    //
    // 2026-08-28 に下記を個別に潰し、ここから外して error に戻した(再発防止):
    //   preserve-manual-memoization  8件 → deps の optional chaining をローカル定数に退避
    //   purity                       4件 → JST現在時刻の式を既存の getJstNow() に集約
    //   immutability                 4件 → props の書き換えを廃止(2件)/ ref コールバックは誤検知
    //   static-components            1件 → iconForKey は react-icons の実体を返すだけ(誤検知)
    //   exhaustive-deps              7件 → 依存を正しく列挙。二重起動ガードは state から ref へ
    //   no-location-assign-…         2件 → セッション確立のため意図的なフルロード(誤検知)
    // 誤検知だったものは該当行に理由付きの eslint-disable-next-line を置いてある。
    //
    // 残り(2026-08-28時点):
    //   set-state-in-effect        132件  effect内での同期的なsetState
    //   refs                        23件  render中の ref.current 書き換え / 参照
    //
    // この2つは「非同期データ取得の結果を state に入れる」「最新の props を ref に
    // 持たせてリスナから読む」というこのアプリ全体の作りそのもので、機械的には潰せない。
    // 直すには読み込み処理を SWR などへ寄せる、ref を effect 代入に変える(反映が
    // ペイント後にずれる)といった実挙動の変わる変更が要り、対象の大半は認証必須ページで
    // 動作確認にも devtest ページ + API モックの用意が要る。腰を据えて着手すること。
    //
    // なお rules-of-hooks(本来のフック規則)の違反は0件。
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
