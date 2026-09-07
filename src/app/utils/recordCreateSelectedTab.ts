import { writeClientCookie } from "@app/utils/clientCookie";
import {
  RECORD_CREATE_SELECTED_TAB_COOKIE,
  RecordCreateTab,
} from "@app/utils/recordCreatePrefs";

/*
 * 記録作成で選んでいるタブの保存(ブラウザ側)。
 *
 * 値と規則の定義は recordCreatePrefs(サーバからも import する)にあり、
 * ここはブラウザ専用の書き込みだけを持つ。デッキ一覧の decksSelectedTab と同じ分け方。
 */

// 選択中タブを保存する(セッション cookie。ブラウザを閉じたら公式イベントに戻る)
export function writeRecordCreateSelectedTab(tab: RecordCreateTab): void {
  writeClientCookie(RECORD_CREATE_SELECTED_TAB_COOKIE, tab);
}
