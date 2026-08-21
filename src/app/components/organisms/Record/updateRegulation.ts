import {
  RecordGetByIdResponseType,
  RecordUpdateResponseType,
} from "@app/types/record";
import { updateRecordFields } from "@app/components/organisms/Record/updateRecord";

// 記録詳細ページ・記録情報モーダルのレギュレーション設定から呼び出す、
// regulation_id のみを変更するPUTリクエスト。他フィールドは現在値をそのまま送る。
export async function updateRegulation(
  record: RecordGetByIdResponseType,
  regulationId: number,
): Promise<RecordUpdateResponseType> {
  return updateRecordFields(record, { regulation_id: regulationId });
}
