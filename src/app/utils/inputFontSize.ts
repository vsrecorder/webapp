/**
 * 入力欄の文字サイズを見張るためのヘルパー。
 *
 * iOS(Safari だけでなく iOS 上の全ブラウザ = WebKit)は、文字サイズが 16px 未満の
 * 入力欄にフォーカスするとページごと拡大する。拡大は自動では戻らず、以降は
 * 横スクロールが出たまま操作することになるため体験を大きく損なう。
 *
 * 底上げ自体は globals.css で一括して当てているので、通常は個々の入力欄で
 * 何もしなくてよい。ここにあるのは「うっかり 16px 未満へ戻していないか」を
 * テスト(inputFontSize.test.ts)から機械的に確かめるための判定である。
 *
 * 見つけたいのは主に次の2つ。
 *  - important 付きの指定(`!text-sm` / `text-sm!`)。globals.css の底上げより強く、
 *    実際に 16px 未満へ戻ってしまう。
 *  - important の無い指定(`text-sm`)。こちらは底上げが勝つので実害は出ないが、
 *    「書いてあるのに効かない」コードが残ると次に読む人を惑わせる。
 */

/** ルートの文字サイズ。rem 指定を px に直すのに使う */
const ROOT_FONT_SIZE_PX = 16;

/** iOS が拡大を始める下限。入力欄はこれ以上でなければならない */
export const MIN_INPUT_FONT_SIZE_PX = 16;

/**
 * 名前付きの文字サイズクラスと実寸(px)。
 * Tailwind の既定に加えて、HeroUI が足す tiny/small/medium/large も見る。
 */
const NAMED_FONT_SIZE_PX: Record<string, number> = {
  "text-xs": 12,
  "text-sm": 14,
  "text-base": 16,
  "text-lg": 18,
  "text-xl": 20,
  "text-2xl": 24,
  "text-3xl": 30,
  "text-4xl": 36,
  "text-tiny": 12,
  "text-small": 14,
  "text-medium": 16,
  "text-large": 18,
};

/**
 * クラス1個を実寸(px)に直す。文字サイズを決めるクラスでない場合と、
 * px/rem 以外の単位で静的に決められない場合は null を返す。
 *
 * 修飾子(`sm:` `dark:` `group-data-[focus=true]:` など)と important(`!`)は
 * 文字サイズの値そのものには関係しないので、判定の前に取り除く。
 */
export function resolveFontSizePx(token: string): number | null {
  let name = token.trim();
  if (!name) return null;

  // 修飾子を落とす。arbitrary variant(`[&>span]:text-sm`)も最後の ":" で切れる
  const lastColon = name.lastIndexOf(":");
  if (lastColon !== -1) name = name.slice(lastColon + 1);

  // important は前置(`!text-sm`)と後置(`text-sm!`)の両方の書き方がある
  name = name.replace(/^!/, "").replace(/!$/, "");

  if (name in NAMED_FONT_SIZE_PX) return NAMED_FONT_SIZE_PX[name];

  // 任意値。text-[14px] / text-[0.875rem] のみ静的に判定できる
  const arbitrary = /^text-\[([^\]]+)\]$/.exec(name);
  if (!arbitrary) return null;

  const value = arbitrary[1].trim();
  const px = /^(\d*\.?\d+)px$/.exec(value);
  if (px) return Number(px[1]);
  const rem = /^(\d*\.?\d+)rem$/.exec(value);
  if (rem) return Number(rem[1]) * ROOT_FONT_SIZE_PX;

  // var(...) や em、行の高さ付きの記法などは判定しない
  return null;
}

/** クラス文字列の中から、16px 未満になる文字サイズクラスだけを拾う */
export function findSmallFontSizeClasses(className: string): string[] {
  return className
    .split(/\s+/)
    .filter((token) => {
      const px = resolveFontSizePx(token);
      return px !== null && px < MIN_INPUT_FONT_SIZE_PX;
    })
    .map((token) => token.trim());
}

export type InputFontSizeViolation = {
  /** 1 始まりの行番号 */
  line: number;
  /** どこを見つけたか(HeroUI のスロット名、またはタグ名) */
  target: string;
  /** 16px 未満になるクラス */
  classes: string[];
};

/**
 * HeroUI の classNames で入力そのものに当たるスロット。
 * input は Input/Textarea/DateInput の入力部、segment は DateInput の
 * 日付セグメント(contenteditable な div)、input-field はその親。
 * 入力欄を包むだけの inputWrapper は、中の文字サイズを決めないので対象外。
 */
const INPUT_SLOTS = ["input", "segment", "inputField"];

/**
 * .tsx のソースから、入力欄へ 16px 未満の文字サイズを直接当てている箇所を探す。
 *
 * 構文解析まではせず、次の2つの書き方だけを見る。実際にこのリポジトリで
 * 入力欄の文字サイズを指定してきたのがこの形だけであり、ここを塞げば
 * 「気づかないうちに 14px へ戻る」経路はふさげる。
 *  1. HeroUI: classNames={{ input: "..." }} のようなスロット指定
 *  2. ネイティブの <input> / <textarea> の className="..."
 */
export function findInputFontSizeViolations(source: string): InputFontSizeViolation[] {
  const violations: InputFontSizeViolation[] = [];
  const lineOf = (index: number) => source.slice(0, index).split("\n").length;

  // 1. HeroUI のスロット指定
  const slotPattern = /\b([a-zA-Z]+)\s*:\s*"([^"]*)"/g;
  for (const m of source.matchAll(slotPattern)) {
    const [, slot, className] = m;
    if (!INPUT_SLOTS.includes(slot)) continue;
    const classes = findSmallFontSizeClasses(className);
    if (classes.length > 0) {
      violations.push({ line: lineOf(m.index), target: slot, classes });
    }
  }

  // 2. ネイティブの <input> / <textarea>
  const tagPattern = /<(input|textarea)\b([^>]*)>/g;
  for (const m of source.matchAll(tagPattern)) {
    const [, tag, attrs] = m;
    // className="..." と className={"..."} / {`...`} を拾う
    for (const c of attrs.matchAll(/className=(?:"([^"]*)"|\{\s*[`"]([^`"]*)[`"]\s*\})/g)) {
      const className = c[1] ?? c[2] ?? "";
      const classes = findSmallFontSizeClasses(className);
      if (classes.length > 0) {
        violations.push({ line: lineOf(m.index), target: `<${tag}>`, classes });
      }
    }
  }

  return violations;
}
