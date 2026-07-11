"use client";

import { SetStateAction, Dispatch } from "react";
import { useState } from "react";

import { addToast, closeToast } from "@heroui/react";

import { LuChartNoAxesColumn, LuCheck, LuTriangleAlert } from "react-icons/lu";

import { RecordGetByIdResponseType } from "@app/types/record";
import { updateIgnoreStatsFlg } from "@app/components/organisms/Record/updateIgnoreStatsFlg";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  // ボードのパネル内に置く場合は true。外側のカード枠(border/bg/影/余白)を外す。
  flat?: boolean;
};

/*
 * 「この記録を戦績集計に含めるか」を切り替える設定カード。
 * 記録詳細ページと記録情報モーダルの双方で同一UIを使い、二択の
 * セグメントコントロールで「含める / 除外」を明示的に選択させる。
 * 選択と同時にAPIへ即時反映する。
 */
export default function IgnoreStatsFlgSetting({
  record,
  setRecord,
  flat = false,
}: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const excluded = record.ignore_stats_flg;

  async function select(nextIgnore: boolean) {
    // 既に選択中の状態、または更新中は何もしない
    if (isUpdating || nextIgnore === record.ignore_stats_flg) return;

    setIsUpdating(true);

    // 切り替え中であることを示すトースト(完了/失敗時に閉じる)
    const loadingToastKey = addToast({
      title: "変更中",
      description: nextIgnore
        ? "この記録を戦績集計から除外しています…"
        : "この記録を戦績集計の対象に戻しています…",
      color: "primary",
      promise: new Promise(() => {}),
    });

    try {
      const ret = await updateIgnoreStatsFlg(record, nextIgnore);

      setRecord((prev) =>
        prev ? { ...prev, ignore_stats_flg: ret.ignore_stats_flg } : prev,
      );

      if (loadingToastKey) closeToast(loadingToastKey);
      addToast({
        title: "変更完了",
        description: ret.ignore_stats_flg
          ? "この記録を戦績集計から除外しました"
          : "この記録を戦績集計の対象に戻しました",
        color: "success",
        timeout: 3000,
      });
    } catch (error) {
      console.error(error);
      if (loadingToastKey) closeToast(loadingToastKey);
      addToast({
        title: "変更失敗",
        description: "変更に失敗しました",
        color: "danger",
        timeout: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className={flat ? "" : "rounded-2xl border border-divider bg-content1 p-3 shadow-sm"}>
      {/* 見出し(ボードのパネル内ではパネル側の見出しを使うため省略) */}
      {!flat && (
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LuChartNoAxesColumn className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-bold">この記録の集計設定</span>
        </div>
      )}

      <p className={`mb-2.5 text-tiny text-default-500 ${flat ? "" : "mt-1"}`}>
        除外すると、勝率・使用デッキ分析・相手デッキ分布・週次レポートの対象外になります。
      </p>

      {/* 二択セグメントコントロール */}
      <div
        role="radiogroup"
        aria-label="戦績集計の設定"
        className="grid grid-cols-2 gap-1 rounded-xl border border-divider bg-default-100 p-1"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!excluded}
          disabled={isUpdating}
          onClick={() => select(false)}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
            !excluded
              ? "bg-content1 text-primary shadow-sm"
              : "text-default-500 hover:text-default-700"
          }`}
        >
          <LuCheck className="h-3.5 w-3.5 shrink-0" />
          集計に含める
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={excluded}
          disabled={isUpdating}
          onClick={() => select(true)}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
            excluded
              ? "bg-warning text-warning-foreground shadow-sm"
              : "text-default-500 hover:text-default-700"
          }`}
        >
          <LuTriangleAlert className="h-3.5 w-3.5 shrink-0" />
          集計から除外
        </button>
      </div>
    </div>
  );
}
