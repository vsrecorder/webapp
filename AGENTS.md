<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## テスト

`npm test`(vitest)。テストは実装の隣に `*.test.ts(x)` で置き、純粋関数・フック・小さな部品を対象にする。
ロジックを変えたら対応するテストを足すか直す。詳細は README の「テスト」の節を参照。

## 入力欄の文字サイズ

入力欄(`<input>` / `<textarea>` / HeroUI の Input・Textarea・DatePicker)の文字は **16px 以上**にする。
iOS はこれ未満の入力欄にフォーカスするとページごと拡大し、拡大は自動では戻らない。
底上げは `globals.css` に一括で入れてあるので普段は何もしなくてよいが、
`classNames={{ input: "text-sm" }}` のような指定で 16px を下回らせないこと
(`src/app/utils/inputFontSize.test.ts` が検出する)。
