import {
  RecordGetByIdResponseType,
  RecordUpdateRequestType,
  RecordUpdateResponseType,
} from "@app/types/record";

// 記録詳細ページの各Infoコンポーネント(公式/Tonamel/自由形式)から共通で呼び出す、
// ignore_stats_flg のみを変更するPUTリクエスト。他フィールドは現在値をそのまま送る。
export async function updateIgnoreStatsFlg(
  record: RecordGetByIdResponseType,
  ignoreStatsFlg: boolean,
): Promise<RecordUpdateResponseType> {
  const data: RecordUpdateRequestType = {
    official_event_id: record.official_event_id,
    tonamel_event_id: record.tonamel_event_id,
    friend_id: record.friend_id,
    deck_id: record.deck_id,
    deck_code_id: record.deck_code_id,
    private_flg: record.private_flg,
    ignore_stats_flg: ignoreStatsFlg,
    tcg_meister_url: record.tcg_meister_url,
    memo: record.memo,
    event_date: record.event_date,
    unofficial_event_id: record.unofficial_event_id,
  };

  const res = await fetch(`/api/records/${record.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const t = await res.json();
    throw new Error(`HTTP error: ${res.status} Message: ${t.message}`);
  }

  return (await res.json()) as RecordUpdateResponseType;
}
