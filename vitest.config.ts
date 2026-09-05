import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// vitest の設定。対象は src 配下の *.test.ts / *.test.tsx で、実装ファイルの隣に置く。
//
// 既定の実行環境は node(純粋関数のテスト)。フックやコンポーネントのテストは、
// ファイル先頭に `// @vitest-environment jsdom` を書いて jsdom に切り替える。
// パスの別名(@app, @firebase)は tsconfig.json の paths と揃える。
export default defineConfig({
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@firebase": fileURLToPath(new URL("./src/firebase", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    // テストごとに CSS を処理する必要は無い(Tailwind のクラス名は文字列として比較する)
    css: false,
  },
});
