// 年月("YYYY-MM")の表示用の整形。月毎の勝率推移のグラフ・シェア画像・ポスト文で共通に使う。

// 並びに複数の年が混ざっているか。混ざっていれば短い表記にも年を添える
export function spansMultipleYears(yearMonths: string[]): boolean {
  return new Set(yearMonths.map((ym) => ym.split("-")[0])).size > 1;
}

// 軸ラベルなどの短い表記。1年に収まるなら「7月」、年を跨ぐなら「25/7」
export function formatShortYearMonth(ym: string, withYear: boolean): string {
  const [year, month] = ym.split("-");
  return withYear ? `${year.slice(2)}/${parseInt(month)}` : `${parseInt(month)}月`;
}

// ツールチップなどの省略しない表記(「2026年7月」)
export function formatLongYearMonth(ym: string): string {
  const [year, month] = ym.split("-");
  return `${year}年${parseInt(month)}月`;
}
