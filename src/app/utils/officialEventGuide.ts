// 自由形式の記録作成で入力されたイベント名から、公式イベント由来のキーワードを検出する。
//
// ジムバトルやトレーナーズリーグなどの公式イベントは、自由形式ではなく公式イベントに
// 紐づく記録として作成した方が、イベント情報(開催店舗・種別など)が自動で紐づいて便利。
// 気づかずに自由形式で入力しているユーザへ「公式イベントに紐づく記録を作成できる」ことを
// 伝えて誘導するために使う(OfficialEventGuideNote)。
//
// 公式イベント名は officialEventHelpers.ts が種別判定に使っている名称に合わせる。
type OfficialEventKeywordDef = {
  // 誘導文に表示する公式イベント名
  label: string;
  // 一致判定に使うパターン。正式名称に加え、ユーザがよく使う略語も含める。
  // 正式名称が略語を含む場合(ジムバトル⊃ジムバ など)も、意図を明示するため両方書く。
  patterns: string[];
};

const OFFICIAL_EVENT_KEYWORDS: OfficialEventKeywordDef[] = [
  { label: "ジムバトル", patterns: ["ジムバトル", "ジムバ"] },
  { label: "トレーナーズリーグ", patterns: ["トレーナーズリーグ", "トレリ"] },
  { label: "シティリーグ", patterns: ["シティリーグ", "シティ"] },
  { label: "チャンピオンズリーグ", patterns: ["チャンピオンズリーグ", "CL"] },
  {
    label: "PJCS",
    patterns: ["ポケモンジャパンチャンピオンシップス", "PJCS", "JCS"],
  },
  { label: "スクランブルバトル", patterns: ["スクランブルバトル"] },
  { label: "エクストラバトルの日", patterns: ["エクストラバトルの日", "エクバ"] },
  { label: "MEGAウインターリーグ", patterns: ["MEGAウインターリーグ"] },
  { label: "マイジムNo.1決定戦", patterns: ["マイジムNo.1決定戦"] },
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

// イベント名に含まれる公式イベントの名称(誘導文に表示するラベル)を返す。
// 含まれなければ null。複数含まれる場合はリスト順で最初に見つかったものを返す。
export function detectOfficialEventKeyword(title: string): string | null {
  const normalizedTitle = normalize(title);
  for (const { label, patterns } of OFFICIAL_EVENT_KEYWORDS) {
    if (patterns.some((p) => normalizedTitle.includes(normalize(p)))) {
      return label;
    }
  }
  return null;
}
