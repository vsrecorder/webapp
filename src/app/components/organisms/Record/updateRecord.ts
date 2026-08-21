import {
  RecordGetByIdResponseType,
  RecordUpdateRequestType,
  RecordUpdateResponseType,
} from "@app/types/record";

/*
 * 記録の一部だけを変更するPUT。
 *
 * 記録の更新APIは全フィールドを受け取り、送らなかったフィールドは空で上書きされるため、
 * 変更しない項目は現在値をそのまま送る必要がある。記録に項目が増えたときの送り漏らしを
 * 防ぐため、リクエストの組み立てはこの1箇所へ集約している。
 */
export async function updateRecordFields(
  record: RecordGetByIdResponseType,
  patch: Partial<RecordUpdateRequestType>,
): Promise<RecordUpdateResponseType> {
  const data: RecordUpdateRequestType = {
    official_event_id: record.official_event_id,
    tonamel_event_id: record.tonamel_event_id,
    friend_id: record.friend_id,
    deck_id: record.deck_id,
    deck_code_id: record.deck_code_id,
    private_flg: record.private_flg,
    ignore_stats_flg: record.ignore_stats_flg,
    regulation_id: record.regulation_id,
    tcg_meister_url: record.tcg_meister_url,
    memo: record.memo,
    event_date: record.event_date,
    unofficial_event_id: record.unofficial_event_id,
    ...patch,
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
