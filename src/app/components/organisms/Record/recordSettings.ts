import { RecordGetByIdResponseType } from "@app/types/record";
import { regulationDisplay } from "@app/types/regulation";

/*
 * 記録の設定(レギュレーション・タグ・戦績集計)の説明文と現在値。
 *
 * 記録詳細ページと記録情報モーダルで設定の見せ方が違う(詳細ページは見出しの「?」、
 * モーダルは編集シートの中)ため、同じ設定の説明が画面によって食い違わないよう
 * 文面と現在値の言い回しをここに集約している。
 */

export const RECORD_SETTING_DESCRIPTIONS = {
  regulation: "この対戦で使用できたカードの範囲です。",
  tag: "大会の結果(優勝・ベスト4 など)や、自分用のラベルを付けられます。",
  ignoreStats:
    "除外すると、勝率・使用デッキ分析・相手デッキ分布・週次レポートの対象外になります。",
} as const;

// レギュレーションの現在値。マスタの取得を待たずに描けるよう表示名の対応表から引く。
export function regulationSummary(record: RecordGetByIdResponseType): string {
  return regulationDisplay(record.regulation_id).name;
}

// 戦績集計の現在値。セグメントコントロールの選択肢と同じ言葉にする。
export function ignoreStatsSummary(record: RecordGetByIdResponseType): string {
  return record.ignore_stats_flg ? "集計から除外" : "集計に含める";
}

// タグの現在値。件数だけを短く出す(中身は付与UIやチップ側で見せる)。
export function tagSummary(record: RecordGetByIdResponseType): string {
  const count = record.tags?.length ?? 0;

  return count > 0 ? `${count}件` : "未設定";
}
