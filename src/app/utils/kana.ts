// カタカナをひらがなに変換する。
// ポケモン名（カタカナ）をひらがな入力でも検索できるようにするために使う。
export function katakanaToHiragana(str: string): string {
  return str.replace(/[ァ-ヶ]/g, (match) => {
    const charCode = match.charCodeAt(0);

    // 「ヴ」はひらがなの「ゔ」へ、それ以外は一律 -0x60
    return String.fromCharCode(charCode === 0x30f4 ? 0x3094 : charCode - 0x60);
  });
}
