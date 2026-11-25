/*
 * Tonamel のイベントID(URL https://tonamel.com/competition/<id> の <id>)として受け付ける形。
 *
 * core-apiserver(domain/entity/tonamel_event.go の IsValidTonamelEventId)と同じにしてある。
 * あちらはこの形でないIDを 400 で断るので、形が違う時点で「そのイベントは無い」と分かる。
 * 実際のIDは英数字5文字だが、あちらに合わせて8文字まで通す。変えるときは両方を揃えること。
 */
const TONAMEL_EVENT_ID_PATTERN = /^[0-9A-Za-z]{1,8}$/;

export function isTonamelEventIdFormat(id: string): boolean {
  return TONAMEL_EVENT_ID_PATTERN.test(id);
}

// 入力欄の下に出す文言。記録作成ページと、記録の編集・クイック記録の入力欄で揃える
export const TONAMEL_EVENT_INVALID_MESSAGE = "無効なイベントIDです";
// 確認できなかったとき。IDが間違っているとは言わない(正しいIDでも出るため)。
// 確認できるまで自動でやり直すので(hooks/useTonamelEventCheck.ts)、利用者は待てばよい。
// 「無効なイベントIDです」と同じ1行に収まる長さにする(折り返すと、下のブロックが余分に動く)
export const TONAMEL_EVENT_UNAVAILABLE_MESSAGE = "確認できませんでした。自動で確認し直します";
