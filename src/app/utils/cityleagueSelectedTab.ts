import { readClientCookie, writeClientCookie } from "@app/utils/clientCookie";
import {
  CITYLEAGUE_SELECTED_TAB_COOKIE,
  CityleagueTab,
  DEFAULT_CITYLEAGUE_TAB,
  parseCityleagueTab,
} from "@app/utils/cityleagueListPrefs";

/*
 * シティリーグ結果一覧の選択中タブのブラウザ側の読み書き。保存先は cookie
 * (cityleagueListPrefs 参照)。サーバ描画((index)/page.tsx)も同じ cookie を読むので、
 * リロード後は最初から同じタブで描かれる。
 */

export type { CityleagueTab };

// 保存済みのタブ。無ければオープンリーグ
export function readCityleagueSelectedTab(): CityleagueTab {
  try {
    return parseCityleagueTab(readClientCookie(CITYLEAGUE_SELECTED_TAB_COOKIE)) ?? DEFAULT_CITYLEAGUE_TAB;
  } catch {
    return DEFAULT_CITYLEAGUE_TAB;
  }
}

// 選択中タブを保存する(セッション cookie。ブラウザを閉じたらオープンリーグに戻る)
export function writeCityleagueSelectedTab(tab: CityleagueTab): void {
  writeClientCookie(CITYLEAGUE_SELECTED_TAB_COOKIE, tab);
}
