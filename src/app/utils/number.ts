// 指定した有効数字の桁数に丸める（例: digits=3の場合 23.456 -> 23.5, 5.456 -> 5.46, 100 -> 100）
// 円グラフのバッジなど表示幅が限られる箇所で、桁数を揃えつつ割合を示すために使う
export function roundToSignificantDigits(value: number, digits: number): number {
  if (value === 0) return 0;
  return Number(value.toPrecision(digits));
}
