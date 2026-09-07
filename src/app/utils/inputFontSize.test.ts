import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  findInputFontSizeViolations,
  findSmallFontSizeClasses,
  resolveFontSizePx,
} from "@app/utils/inputFontSize";

const appDir = fileURLToPath(new URL("..", import.meta.url));
const globalsCss = readFileSync(join(appDir, "globals.css"), "utf8");

/** src/app 配下の .tsx を全部集める */
function collectTsxFiles(): string[] {
  return readdirSync(appDir, { recursive: true, encoding: "utf8" })
    .filter((p) => p.endsWith(".tsx") && !p.endsWith(".test.tsx"))
    .map((p) => join(appDir, p));
}

describe("resolveFontSizePx", () => {
  it("名前付きのクラスを実寸に直す(Tailwind と HeroUI の両方)", () => {
    expect(resolveFontSizePx("text-sm")).toBe(14);
    expect(resolveFontSizePx("text-base")).toBe(16);
    expect(resolveFontSizePx("text-small")).toBe(14);
    expect(resolveFontSizePx("text-medium")).toBe(16);
  });

  it("修飾子と important を外してから判定する", () => {
    expect(resolveFontSizePx("sm:text-xs")).toBe(12);
    expect(resolveFontSizePx("!text-sm")).toBe(14);
    expect(resolveFontSizePx("text-sm!")).toBe(14);
    expect(resolveFontSizePx("group-data-[focus=true]:text-sm")).toBe(14);
  });

  it("任意値は px と rem だけ判定する", () => {
    expect(resolveFontSizePx("text-[14px]")).toBe(14);
    expect(resolveFontSizePx("text-[0.875rem]")).toBe(14);
    expect(resolveFontSizePx("text-[1rem]")).toBe(16);
    expect(resolveFontSizePx("text-[length:var(--x)]")).toBeNull();
  });

  it("文字サイズと関係ないクラスは null", () => {
    expect(resolveFontSizePx("text-default-500")).toBeNull();
    expect(resolveFontSizePx("overflow-hidden")).toBeNull();
    expect(resolveFontSizePx("")).toBeNull();
  });
});

describe("findSmallFontSizeClasses", () => {
  it("16px 未満のクラスだけを返す", () => {
    expect(findSmallFontSizeClasses("overflow-hidden text-sm font-bold")).toEqual(["text-sm"]);
    expect(findSmallFontSizeClasses("text-base text-default-500")).toEqual([]);
    expect(findSmallFontSizeClasses("text-lg")).toEqual([]);
  });
});

describe("findInputFontSizeViolations", () => {
  it("HeroUI の input / segment スロットの指定を見つける", () => {
    const source = `
      <Textarea classNames={{ input: "text-sm overflow-hidden" }} />
      <DatePicker classNames={{ segment: "!text-tiny" }} />
    `;
    expect(findInputFontSizeViolations(source)).toEqual([
      { line: 2, target: "input", classes: ["text-sm"] },
      { line: 3, target: "segment", classes: ["!text-tiny"] },
    ]);
  });

  it("ネイティブの input / textarea の className も見つける", () => {
    const source = `<input type="text" className="w-full text-xs" />`;
    expect(findInputFontSizeViolations(source)).toEqual([
      { line: 1, target: "<input>", classes: ["text-xs"] },
    ]);
  });

  it("入力欄を包むだけのスロットや、16px 以上の指定は拾わない", () => {
    const source = `
      <Input classNames={{ inputWrapper: "text-sm", input: "text-base" }} />
      <select className="text-xs" />
    `;
    expect(findInputFontSizeViolations(source)).toEqual([]);
  });
});

/**
 * ここから下は回帰テスト。
 *
 * iPhone で入力欄にフォーカスすると画面が拡大する不具合(2026-09-08 修正)の再発を止める。
 * iOS は文字サイズが 16px 未満の入力欄にフォーカスするとページごと拡大し、
 * それは自動では戻らない。対策は globals.css の一括の底上げに寄せてあるので、
 * 「底上げが消えていないか」と「個々の入力欄で 16px 未満へ戻していないか」を見る。
 */
describe("入力欄の文字サイズ(iOS のオートズーム対策)", () => {
  it("globals.css が <input> / <textarea> を 16px 以上へ底上げしている", () => {
    // input と textarea の両方を含むセレクタに font-size: 1rem が当たっていること
    const rule = /input[^{}]*,\s*\n?\s*textarea\s*\{[^}]*font-size:\s*1rem/;
    expect(globalsCss).toMatch(rule);
  });

  it("globals.css が DateInput のセグメントを 16px 以上へ底上げしている", () => {
    // DatePicker の年/月/日は contenteditable な div なので input の指定では届かない
    const rule = /\[data-slot="input-field"\]\s*\{[^}]*font-size:\s*1rem/;
    expect(globalsCss).toMatch(rule);
  });

  it("入力欄に 16px 未満の文字サイズを直接指定していない", () => {
    const found = collectTsxFiles().flatMap((file) =>
      findInputFontSizeViolations(readFileSync(file, "utf8")).map(
        (v) => `${file.slice(appDir.length)}:${v.line} ${v.target} → ${v.classes.join(" ")}`,
      ),
    );

    // 落ちたら: そのクラスを外す。入力欄の文字は 16px 以上でなければ iOS が拡大する
    expect(found).toEqual([]);
  });
});
