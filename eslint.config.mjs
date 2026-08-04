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
    // 既存コードに対して165件出るが、いずれも「今まで通っていたものが壊れた」のではなく
    // 「これまで検査されていなかった観点が増えた」もの。Next.js 16 化とは独立した
    // リファクタ課題なので、ここでは warning に落として lint を実用可能な状態に保つ。
    //
    // 内訳(2026-08-04時点):
    //   set-state-in-effect        125件  effect内での同期的なsetState
    //   refs                        23件  render中のref.current書き換え
    //   preserve-manual-memoization  8件  手書きmemoの前提が崩れている箇所
    //   purity / immutability      各4件
    //   static-components            1件
    //
    // 個別に潰したら順次このブロックから消していく。
    // なお rules-of-hooks(本来のフック規則)の違反は0件だった。
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
