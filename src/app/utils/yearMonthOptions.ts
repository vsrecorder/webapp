// 「月次」フィルタで使う年月選択肢を生成する共通ユーティリティ。
// OpponentDeckUsagePanel/DeckUsagePanel等、複数のパネルで同じ生成ロジックを使うため切り出している。
//
// 月の境界は常に JST で判定する(utils/yearMonth.ts と同じ規約)。
// Date の getFullYear/getMonth は端末のタイムゾーンで解釈されるため、これで年月を
// 組み立てるとサーバ(TZ=Asia/Tokyo)と JST 以外の端末とで月替わりの瞬間に食い違い、
// ハイドレーション不一致や「選択中の年月が選択肢に無い」状態を招く。

import { toJSTDate } from "@app/utils/date";
import { currentYearMonth, yearMonthLabel } from "@app/utils/yearMonth";

// 年月を「年 * 12 + (月 - 1)」の通し番号に変換する。基準は常にJST。
// 月の加減算も Date ではなくこの通し番号の整数演算で行う(年跨ぎを自前で扱わずに済む)。
function jstYearMonthIndex(date: Date | string): number {
  const jst = toJSTDate(date);
  return jst.getUTCFullYear() * 12 + jst.getUTCMonth();
}

function yearMonthValue(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

// JSTでの当月を "YYYY-MM" で返す
export function getCurrentYearMonth(): string {
  return currentYearMonth();
}

// 起点(記録の最古日・なければ登録日)の月から当月までの年月選択肢を、新しい順で生成する。
// 起点が無ければ直近12ヶ月。
export function generateYearMonthOptions(startedAt?: Date | string) {
  const currentIndex = jstYearMonthIndex(new Date());
  const startIndex =
    startedAt != null ? jstYearMonthIndex(startedAt) : currentIndex - 11;

  const options: { value: string; label: string }[] = [];
  for (let index = currentIndex; index >= startIndex; index--) {
    const value = yearMonthValue(index);
    options.push({ value, label: yearMonthLabel(value) });
  }

  return options;
}
