// タグの文字色。タグは背景色(#RRGGBB)を自分で持ち、その上に名前を太字で描く。

// 文字色を持たないタグ向けの既定値。背景の明るさに応じてこの2色から選ぶ。
const LIGHT_TEXT = "#FFFFFF";
// Tailwind の zinc-900。黒よりわずかに柔らかく、明るい背景に乗せても浮かない。
const DARK_TEXT = "#18181B";

// 白文字を維持する下限のコントラスト比。これを下回る背景でだけ暗い文字へ落とす。
//
// 「白と黒でコントラストが高い方」を選ぶ一般的なやり方にしていないのは、
// 既に運用しているタグの見た目を変えないため(ACE SPEC の #FF007F は白 3.78 / 黒 5.56 で、
// 高い方を採ると黒に変わってしまう)。この線を挟んで最も近い色でも 2.47 と 3.76 で
// 開きがあり、後からユーザーが色を付けても判定がぶれない。
const WHITE_CONTRAST_FLOOR = 3;

const HEX_COLOR_PATTERN = /^#([0-9a-f]{6})$/i;

// sRGBの各チャンネル(0-255)を線形値へ戻す(WCAG 2.x の定義)。
function channelToLinear(channel: number): number {
  const value = channel / 255;

  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

// 相対輝度。'#RRGGBB' 以外(未設定の空文字など)は null を返す。
function relativeLuminance(color: string): number | null {
  const matched = HEX_COLOR_PATTERN.exec(color.trim());
  if (!matched) return null;

  const value = parseInt(matched[1], 16);

  return (
    0.2126 * channelToLinear((value >> 16) & 0xff) +
    0.7152 * channelToLinear((value >> 8) & 0xff) +
    0.0722 * channelToLinear(value & 0xff)
  );
}

/*
 * タグの背景色の上に乗せる文字色を返す。
 *
 * タグ自身が文字色(text_color)を持っていればそれに従う。大会順位のプリセットは
 * シティリーグ入賞バッジ(cityleagueRank.ts)と配色を寸分違わず揃えたいので、
 * 背景色と文字色の組をサーバ側で決めている。
 *
 * 持っていない場合(ユーザーが付けた色、ACE SPEC など)は背景の明るさから選ぶ。
 * 色を持たないタグはチップ既定の見た目のままなので、呼び出し側はこの関数を使わない。
 */
export function tagTextColor(color: string, textColor?: string): string {
  if (textColor && HEX_COLOR_PATTERN.test(textColor.trim())) {
    return textColor.trim();
  }

  const luminance = relativeLuminance(color);
  if (luminance === null) return LIGHT_TEXT;

  // 白(輝度1.0)とのコントラスト比
  const whiteContrast = 1.05 / (luminance + 0.05);

  return whiteContrast < WHITE_CONTRAST_FLOOR ? DARK_TEXT : LIGHT_TEXT;
}
