// 自由入力欄の文字数上限。
//
// core-apiserver 側のバリデーション(internal/controller/validation/util.go)と
// 対応しており、超過するとAPIが400を返す。エラー内容までは返らないため、
// 何も出さないと「理由の分からない失敗」になってしまう。送信前にUIで気づけるよう、
// ここに上限を集約して各入力欄から参照する。
// 値を変更する場合は必ず向こうの定数(とDBのVARCHAR定義)も合わせること。

export const MAX_USER_NAME_LENGTH = 63; // users.name VARCHAR(63)
export const MAX_DECK_NAME_LENGTH = 32; // decks.name VARCHAR(32)
export const MAX_EVENT_TITLE_LENGTH = 255; // unofficial_events.title VARCHAR(255)
export const MAX_OPPONENTS_DECK_INFO_LENGTH = 63; // matches.opponents_deck_info VARCHAR(63)

// 入力文字数を数える。
//
// String.length はUTF-16のコードユニット数なので、絵文字やサロゲートペアの漢字(𠮷など)が
// 2文字として数えられてしまい、コードポイント数(rune)で判定するサーバ側とずれる。
// 分割してコードポイント単位で数えることで、両者の判定を一致させる。
export function countTextLength(text: string): number {
  return [...text].length;
}

// 入力値がサーバ側の上限を超えているか。
// 前後の空白は送信時に落とされるため、判定も trim 後の文字列で行う。
export function exceedsTextLength(text: string, max: number): boolean {
  return countTextLength(text.trim()) > max;
}
