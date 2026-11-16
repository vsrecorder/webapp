# deepmerge(修正版の同梱)

[deepmerge](https://github.com/TehShrike/deepmerge) 4.3.1 の `dist/cjs.js` に、
プロトタイプ汚染の脆弱性 [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
(CVE-2026-93753、上流 issue #273)の修正を当てたもの。上流は 4.3.1 のまま修正版を出していない。

## なぜ置いているか

`@heroui/theme` が `deepmerge@4.3.1` を固定で使っており(Tailwind プラグイン `heroui()` が
テーマの色・レイアウトを既定値と合成する)、npm audit が low で指摘し続けるため。
このアプリでの入力は `src/app/hero.ts` の固定の設定だけなので、実際に悪用される経路は無い。

## どう差し替えているか

- `package.json` の `dependencies` に `"deepmerge": "file:vendor/deepmerge"`
- `overrides` に `"deepmerge": "$deepmerge"`(推移的な依存もこれに揃える)

overrides に直接 `file:` を書くと、相対パスが `@heroui/theme` 側を基準に解決されて lock が壊れる。
Docker の deps 段は `npm ci` の前に `COPY vendor ./vendor` が要る。

## 修正の中身

`index.js` の「修正:」のコメントを参照。キー名 `__proto__` / `constructor` / `prototype` を捨て、
書き込みを `Object.defineProperty` にした。それ以外の動きは原本と同じで、
`heroui()` から生成される CSS が原本と 1 バイトも変わらないことを確かめてある(2026-11-16)。
テストは `index.test.ts`(脆弱性の 4 件は原本だと落ちる)。

## 外すとき

上流か `@heroui/theme` が修正版(または別の実装)に移ったら、このディレクトリと上の 2 行、
Dockerfile の `COPY vendor ./vendor`、`vitest.config.ts` の `vendor/**` を消して `npm install` する。
