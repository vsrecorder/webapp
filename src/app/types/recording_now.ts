import { EventKind } from "@app/components/molecules/EventIcon";

/*
 * 画面下に常駐する「続きを記録」バーに出すぶんの、記録中のイベント。
 *
 * ホーム上部のカード(RecordingNowCard)は記録そのものを受け取るが、バーは表示と
 * 記録詳細ページへの遷移しかしないので、記録IDと見せる値だけで足りる。
 */
export type RecordingNowBarType = {
  recordId: string;
  // イベント名。取れなければ空文字(バーは「無題のイベント」と出す)
  eventTitle: string;
  // 公式イベントのアイコン画像。Tonamel と自由形式は null(種別から描く)
  eventIconUrl: string | null;
  // イベントの種別。アイコンの出し分けに使う
  eventKind: EventKind;
  // 会場(公式イベントのみ)。空なら出さない
  venue: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  // 集計が取れたか。false のときは勝敗を出さない(0勝0敗と誤解させないため)
  hasSummary: boolean;
};

export type RecordingNowGetResponseType = {
  recording: RecordingNowBarType | null;
};
