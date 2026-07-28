/*
 * デッキコード入力の正規化。
 *
 * 公式のデッキコードは「XXXXXX-XXXXXX-XXXXXX」のハイフン込み20桁。
 * 有効性は https://www.pokemon-card.com/deck/deckIDCheck.php に問い合わせるが、
 * 入力値に余計な文字が混ざっていると問い合わせる前(桁数チェック)で弾かれ、
 * 「有効なデッキコードを貼り付けてください」が出たままになる。
 *
 * 実際に弾かれていた例:
 *   - 末尾の改行/半角スペース(コピー範囲に入り込む)      … 21桁以上になり無効
 *   - 全角ハイフン(IME経由の入力)                        … 20桁だがAPIが95000を返す
 *   - デッキ共有URLをまるごと貼り付け                    … 桁数が全く合わず無効
 *
 * いずれも見た目には「正しいデッキコード」なので、入力時点で吸収する。
 */

// ハイフン込み20桁。URLに紛れていてもこの並びを取り出せる。
const DECK_CODE_PATTERN = /[0-9A-Za-z]{6}-[0-9A-Za-z]{6}-[0-9A-Za-z]{6}/;

// ハイフンとして扱う文字(全角ハイフン・各種ダッシュ・長音符)。iOSのスマート句読点やIMEで混入する。
const HYPHEN_LIKE = /[‐-―⁃−﹘﹣－ー]/g;

// 空白として扱う文字(半角/全角スペース・タブ・改行)。
const WHITESPACE_LIKE = /[\s　]/g;

/*
  全角英数字を半角に変換する。
  IMEが全角のままだとAPIが「文字種が一致しません」を返すため。
*/
const toHalfWidthAlnum = (value: string): string =>
  value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );

/*
  入力値をデッキコードとして解釈できる形に整える。

  貼り付け直後に呼ぶことを想定しているので、途中入力(20桁未満)は
  そのまま返す。整形しきれない場合も入力値を壊さずに返し、
  最終的な有効判定は公式APIに委ねる。
*/
export const normalizeDeckCode = (value: string): string => {
  const normalized = toHalfWidthAlnum(value)
    .replace(HYPHEN_LIKE, "-")
    .replace(WHITESPACE_LIKE, "");

  // URLごと貼り付けられた場合はデッキコード部分だけを取り出す
  const matched = normalized.match(DECK_CODE_PATTERN);
  if (matched) {
    return matched[0];
  }

  return normalized;
};
