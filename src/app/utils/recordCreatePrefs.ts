/*
 * 記録作成(/records/create)のタブ(公式イベント/Tonamel/自由形式)の保存先と、その値の検証。
 *
 * cookie に持つ。以前は sessionStorage だったが、サーバは読めないため、サーバ描画は
 * 常に「公式イベント」タブとして描かれていた。そのせいで
 *
 *   - タブが確定するまでフォームを骨格で隠す必要があった(確定前に描くと差し替わって見える)
 *   - 自由形式・Tonamel を使う人にも、公式イベントの候補(土日は1,400件超・gzip 90KB台)を
 *     サーバ側で先読みしてしまう
 *
 * という2つの無駄があった。cookie なら records/create/page.tsx が読めて、最初から
 * そのタブの形で描ける。デッキ一覧の表示設定(deckListPrefs)と同じ考え方。
 *
 * ここはサーバ・クライアント両方から import するので、ブラウザ専用の処理は置かない
 * (document.cookie の読み書きは utils/clientCookie)。
 */

// 以前の sessionStorage と同じく、ブラウザを閉じたら公式イベントに戻したいので
// セッション cookie(有効期限なし)。キー名も当時のまま
export const RECORD_CREATE_SELECTED_TAB_COOKIE = "recordCreateSelectedTab";

export type RecordCreateTab = "official" | "tonamel" | "unofficial";

// タブ未選択時の既定。記録の主導線である公式イベント
export const DEFAULT_RECORD_CREATE_TAB: RecordCreateTab = "official";

// cookie も URL のクエリも誰でも書き換えられるので、既知の値以外は無視する
export function parseRecordCreateTab(
  value: string | null | undefined,
): RecordCreateTab | null {
  return value === "official" || value === "tonamel" || value === "unofficial"
    ? value
    : null;
}

/*
 * 開くタブを決める。
 *
 * 公式イベントを名指しした遷移(Myジムのイベント詳細など)は、そのイベントを
 * 選ばせるのが目的なので、URL の event_type や保存済みのタブより優先する。
 */
export function resolveRecordCreateTab(input: {
  officialEventId: string | undefined;
  eventType: string | undefined;
  savedTab: string | null | undefined;
}): RecordCreateTab {
  if (input.officialEventId) return "official";

  return (
    parseRecordCreateTab(input.eventType) ??
    parseRecordCreateTab(input.savedTab) ??
    DEFAULT_RECORD_CREATE_TAB
  );
}
