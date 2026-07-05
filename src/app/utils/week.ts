// 週次デッキ使用率ページの週セレクタ用ユーティリティ。
// 週は月曜始まりとし、値は週の月曜日を "YYYY-MM-DD" で表す（core-api の week パラメータ形式と一致）。

// 指定日が属する週の月曜日を返す。
function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay: 日曜=0 ... 土曜=6。月曜始まりの経過日数へ変換する。
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 今週（今日が属する週）の月曜日を "YYYY-MM-DD" で返す。
export function currentWeekValue(): string {
  return formatDate(mondayOf(new Date()));
}

// 先週（今週の1つ前の週）の月曜日を "YYYY-MM-DD" で返す。
// 今週はまだ記録が途中経過で使用率が変動しやすいため、デフォルト表示には先週を使う。
export function lastWeekValue(): string {
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() - 7);
  return formatDate(monday);
}

// 直近 count 週分の週セレクタ選択肢を新しい週順で生成する。
// 例: { value: "2026-06-29", label: "6/29〜7/5 の週" }
export function generateWeekOptions(count = 12): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const monday = mondayOf(new Date());

  for (let i = 0; i < count; i++) {
    const start = new Date(monday);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const label = `${start.getMonth() + 1}/${start.getDate()}〜${end.getMonth() + 1}/${end.getDate()} の週`;
    options.push({ value: formatDate(start), label });
  }

  return options;
}
