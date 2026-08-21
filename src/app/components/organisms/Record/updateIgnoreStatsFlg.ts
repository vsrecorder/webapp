import {
  RecordGetByIdResponseType,
  RecordUpdateResponseType,
} from "@app/types/record";
import { updateRecordFields } from "@app/components/organisms/Record/updateRecord";

// 記録詳細ページの各Infoコンポーネント(公式/Tonamel/自由形式)から共通で呼び出す、
// ignore_stats_flg のみを変更するPUTリクエスト。他フィールドは現在値をそのまま送る。
export async function updateIgnoreStatsFlg(
  record: RecordGetByIdResponseType,
  ignoreStatsFlg: boolean,
): Promise<RecordUpdateResponseType> {
  return updateRecordFields(record, { ignore_stats_flg: ignoreStatsFlg });
}
