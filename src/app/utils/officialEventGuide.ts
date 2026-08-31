// 自由形式の記録作成で入力されたイベント名から、公式イベント由来のキーワードを検出する。
//
// ジムバトルやトレーナーズリーグなどの公式イベントは、自由形式ではなく公式イベントに
// 紐づく記録として作成した方が、イベント情報(開催店舗・種別など)が自動で紐づいて便利。
// 気づかずに自由形式で入力しているユーザへ「公式イベントに紐づく記録を作成できる」ことを
// 伝えて誘導するために使う(useOfficialEventGuide / OfficialEventGuideNote)。
//
// 公式イベント名は officialEventHelpers.ts が種別判定に使っている名称に合わせる。

/*
 * 一致のとり方。略語は短く他の語に埋もれやすいため、単純な部分一致だと誤検出する。
 *
 * - substring : 単純な部分一致。正式名称のように長く、他の語に埋もれない表記に使う。
 *               "ジムバ" のような略語も、店舗名と続けて書かれる(カードラボジムバ /
 *               ジムバカードラボ)ため前後どちらも境界にならない。境界では判定できず、
 *               別の語を拾ってしまう分は excludes で個別に除外する。
 * - latinWord : 前後が英字でないときだけ一致とみなす。"CL" を単純一致にすると
 *               CIRCLE / CLUB / CLOSE / CLASSIC / MIRACLE などの英単語を拾ってしまう。
 *               数字は区切りとみなすため "CL2026京都" は一致する。
 * - kanaWord  : 前後がカタカナでないときだけ一致とみなす。"シティ" を単純一致にすると
 *               キャナルシティ / サンシティ / パークシティ など会場・施設名を拾ってしまう。
 *               "シティリーグ" のように後ろにカタカナが続く表記は、同じ定義に並べた
 *               正式名称のパターン(substring)側で拾われる。
 */
type MatchRule = "substring" | "latinWord" | "kanaWord";

type OfficialEventPattern = {
  text: string;
  rule?: MatchRule; // 省略時は substring
  // 略語がその語の先頭として現れたときに一致とみなさないための除外語。
  // 例: "ジムバ" は「ジムバッジ」の先頭にも現れるが、イベント名としては別物。
  // 略語で始まる語だけを列挙する(略語の前に別の語が付くケースは店舗名と区別できない)。
  excludes?: string[];
};

type OfficialEventKeywordDef = {
  // 誘導文に表示する公式イベント名
  label: string;
  // 一致判定に使うパターン。正式名称に加え、ユーザがよく使う略語も含める。
  patterns: OfficialEventPattern[];
};

const OFFICIAL_EVENT_KEYWORDS: OfficialEventKeywordDef[] = [
  {
    label: "ジムバトル",
    patterns: [
      { text: "ジムバトル" },
      { text: "ジムバ", excludes: ["ジムバッジ", "ジムバッグ"] },
    ],
  },
  {
    label: "トレーナーズリーグ",
    patterns: [
      { text: "トレーナーズリーグ" },
      { text: "トレリ", excludes: ["トレリス"] },
    ],
  },
  {
    label: "シティリーグ",
    patterns: [{ text: "シティリーグ" }, { text: "シティ", rule: "kanaWord" }],
  },
  {
    label: "チャンピオンズリーグ",
    patterns: [{ text: "チャンピオンズリーグ" }, { text: "CL", rule: "latinWord" }],
  },
  {
    label: "PJCS",
    patterns: [
      { text: "ポケモンジャパンチャンピオンシップス" },
      { text: "PJCS", rule: "latinWord" },
      { text: "JCS", rule: "latinWord" },
    ],
  },
  { label: "スクランブルバトル", patterns: [{ text: "スクランブルバトル" }] },
  {
    label: "エクストラバトルの日",
    patterns: [{ text: "エクストラバトルの日" }, { text: "エクバ" }],
  },
  { label: "MEGAウインターリーグ", patterns: [{ text: "MEGAウインターリーグ" }] },
  { label: "マイジムNo.1決定戦", patterns: [{ text: "マイジムNo.1決定戦" }] },
];

// 表記ゆれを吸収するための正規化。
// - NFKC: 全角英数(ＰＪＣＳ)や半角カナ(ｼﾞﾑﾊﾞﾄﾙ)を標準形へ寄せる
// - ひらがな→カタカナ: 「じむばとる」のようなひらがな入力でも検出できるようにする
// - 大文字化: pjcs のような小文字入力を吸収する
function normalize(str: string): string {
  return str
    .normalize("NFKC")
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .toUpperCase();
}

// 一致の境界とみなさない文字(この文字が隣接していたら「語の途中」なので一致としない)
const LATIN_BOUNDARY = /[A-Z]/;
const KATAKANA_BOUNDARY = /[ァ-ヶー]/;

// haystack の index 位置に現れた needle を、一致とみなしてよいか判定する
function isMatchAt(
  haystack: string,
  needle: string,
  index: number,
  rule: MatchRule,
  excludes: string[],
): boolean {
  // 略語が別の語(ジムバ→ジムバッジ)の先頭になっている出現は一致とみなさない
  if (excludes.some((word) => haystack.startsWith(word, index))) return false;

  if (rule === "substring") return true;

  const boundary = rule === "latinWord" ? LATIN_BOUNDARY : KATAKANA_BOUNDARY;

  // charAt は範囲外で空文字を返すため、文字列の端も境界として扱える
  const before = index === 0 ? "" : haystack.charAt(index - 1);
  const after = haystack.charAt(index + needle.length);
  return !boundary.test(before) && !boundary.test(after);
}

function includesPattern(
  haystack: string,
  needle: string,
  rule: MatchRule,
  excludes: string[],
): boolean {
  // 同じ略語が複数回現れることがあるため、条件を満たす出現が1つでもあれば一致とする
  for (let from = 0; from <= haystack.length; ) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) return false;

    if (isMatchAt(haystack, needle, index, rule, excludes)) return true;

    from = index + 1;
  }
  return false;
}

// パターンの正規化はモジュール読み込み時に一度だけ行う。
// 検出は入力のたびに走るため、毎回パターン側を正規化し直さない。
const NORMALIZED_KEYWORDS: {
  label: string;
  patterns: { text: string; rule: MatchRule; excludes: string[] }[];
}[] = OFFICIAL_EVENT_KEYWORDS.map(({ label, patterns }) => ({
  label,
  patterns: patterns.map(({ text, rule, excludes }) => ({
    text: normalize(text),
    rule: rule ?? "substring",
    excludes: (excludes ?? []).map(normalize),
  })),
}));

// イベント名に含まれる公式イベントの名称(誘導文に表示するラベル)を返す。
// 含まれなければ null。複数含まれる場合はリスト順で最初に見つかったものを返す。
export function detectOfficialEventKeyword(title: string): string | null {
  if (title.trim() === "") return null;

  const normalizedTitle = normalize(title);
  for (const { label, patterns } of NORMALIZED_KEYWORDS) {
    const matched = patterns.some(({ text, rule, excludes }) =>
      includesPattern(normalizedTitle, text, rule, excludes),
    );
    if (matched) {
      return label;
    }
  }
  return null;
}
