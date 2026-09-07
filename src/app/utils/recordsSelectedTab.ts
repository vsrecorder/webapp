import { readClientCookie, writeClientCookie } from "@app/utils/clientCookie";
import {
  RECORDS_SELECTED_TAB_COOKIE,
  RecordsTab,
  parseRecordsTab,
} from "@app/utils/recordListPrefs";

/*
 * 記録一覧の選択中タブのブラウザ側の読み書き。保存先は cookie(recordListPrefs 参照)。
 * サーバ描画(records/page.tsx)も同じ cookie を読むので、リロード後は最初から同じタブで描かれる。
 */

export type { RecordsTab };

// 保存済みのタブ。無ければ「すべて」
export function readRecordsSelectedTab(): RecordsTab {
  try {
    return parseRecordsTab(readClientCookie(RECORDS_SELECTED_TAB_COOKIE)) ?? "all";
  } catch {
    return "all";
  }
}

// 選択中タブを保存する(セッション cookie。ブラウザを閉じたら「すべて」に戻る)
export function writeRecordsSelectedTab(tab: RecordsTab): void {
  writeClientCookie(RECORDS_SELECTED_TAB_COOKIE, tab);
}
