// OGP画像(satori)に描く1行テキストを、折り返さないフォントサイズで表示するための計算。
//
// satori は文字列の幅を実測できず、枠に収まらない文字列は勝手に折り返す(または lineClamp で
// 切られる)。そこで「どれくらいの幅になるか」を先に概算し、枠に収まる最大のサイズを選ぶ。

// 文字種ごとの表示幅(フォントサイズに対する比)。Noto Sans JP Bold を実際に描画して
// 測った値(fontSize=100 での実測幅を100で割ったもの)に、端の余白ぶんを足した概算。
//   かな・漢字・全角記号: 0.99 → 1.0   小文字: 0.50 → 0.52   大文字: 0.62 → 0.65
//   数字: 0.58 → 0.60                  半角記号・空白: 0.55
// 半角記号は幅の差が大きい("+" は約0.57、"." は約0.25)。狭い方に合わせると溢れるため、
// 広い方に寄せて見積もる(見積もりが過大な場合は1段小さく表示されるだけで済む)。
const EM_LOWER = 0.52;
const EM_UPPER = 0.65;
const EM_DIGIT = 0.6;
const EM_HALF_WIDTH = 0.55;
const EM_FULL_WIDTH = 1.0;

// 半角として扱う範囲: ASCII の表示文字と半角カナ
const HALF_WIDTH_PATTERN = /[ -~｡-ﾟ]/;

// 文字列の表示幅を「フォントサイズの何倍か」で返す。
export function textWidthEm(text: string): number {
  let em = 0;

  for (const ch of text) {
    if (/[a-z]/.test(ch)) em += EM_LOWER;
    else if (/[A-Z]/.test(ch)) em += EM_UPPER;
    else if (/[0-9]/.test(ch)) em += EM_DIGIT;
    else if (HALF_WIDTH_PATTERN.test(ch)) em += EM_HALF_WIDTH;
    else em += EM_FULL_WIDTH;
  }

  return em;
}

// 概算と実描画のずれ(数%)を吸収する安全率。これを掛けた幅に収まるサイズを選ぶ。
const WIDTH_MARGIN = 0.97;

// デッキ名を1行で表示するためのフォントサイズ(px)。
//
// デッキ名はユーザーの自由入力で上限が無く、長いものは下限サイズでも枠に収まらない。
// その場合はここで返した下限サイズのまま lineClamp:1 で末尾を省略する(呼び出し側の責務)。
export function deckNameFontSize(
  name: string,
  width: number,
  maxFontSize: number,
  minFontSize = 28,
): number {
  const em = textWidthEm(name);
  if (em <= 0) return maxFontSize;

  return Math.max(minFontSize, Math.min(maxFontSize, Math.floor((width * WIDTH_MARGIN) / em)));
}
