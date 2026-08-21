"use client";

import { SetStateAction, Dispatch } from "react";
import { useState } from "react";

import { addToast, closeToast } from "@heroui/react";

import { LuScrollText } from "react-icons/lu";

import { RecordGetByIdResponseType } from "@app/types/record";
import { useRegulations } from "@app/hooks/useRegulations";
import RegulationSegmentedControl from "@app/components/molecules/RegulationSegmentedControl";
import { updateRegulation } from "@app/components/organisms/Record/updateRegulation";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  // ボードのパネル内に置く場合は true。外側のカード枠(border/bg/影/余白)を外す。
  flat?: boolean;
  // 切り替えAPIの実行中かどうかを親へ通知する。
  // モーダル内で使う場合、更新中に閉じられて結果が見えなくなるのを防ぐために使う。
  onUpdatingChange?: (isUpdating: boolean) => void;
};

/*
 * 記録のレギュレーション(使用可能なカードの範囲)を切り替える設定カード。
 * 記録詳細ページと記録情報モーダルの双方で同一UIを使い、記録作成フォームと同じ
 * 3択のセグメントコントロールで選ばせる。選択と同時にAPIへ即時反映する。
 */
export default function RegulationSetting({
  record,
  setRecord,
  flat = false,
  onUpdatingChange,
}: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const regulations = useRegulations();

  // 更新中フラグは親(モーダル)にも伝える。親は実行中の閉じる操作を無効化する。
  function updateIsUpdating(next: boolean) {
    setIsUpdating(next);
    onUpdatingChange?.(next);
  }

  async function select(nextRegulationId: number) {
    // 既に選択中の状態、または更新中は何もしない
    if (isUpdating || nextRegulationId === record.regulation_id) return;

    updateIsUpdating(true);

    // 切り替え中であることを示すトースト(完了/失敗時に閉じる)
    const loadingToastKey = addToast({
      title: "変更中",
      description: "レギュレーションを変更しています…",
      color: "primary",
      promise: new Promise(() => {}),
    });

    try {
      const ret = await updateRegulation(record, nextRegulationId);

      setRecord((prev) =>
        prev ? { ...prev, regulation_id: ret.regulation_id } : prev,
      );

      if (loadingToastKey) closeToast(loadingToastKey);
      addToast({
        title: "変更完了",
        description: `レギュレーションを${
          regulations.find((regulation) => regulation.id === ret.regulation_id)?.name ??
          "変更"
        }にしました`,
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
      updateIsUpdating(false);
    }
  }

  return (
    <div
      className={
        flat ? "" : "rounded-2xl border border-divider bg-content1 p-3 shadow-sm"
      }
    >
      {/* 見出し(ボードのパネル内ではパネル側の見出しを使うため省略) */}
      {!flat && (
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LuScrollText className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-bold">この記録のレギュレーション</span>
        </div>
      )}

      <p className={`mb-2.5 text-tiny text-default-500 ${flat ? "" : "mt-1"}`}>
        この対戦で使用できたカードの範囲です。
      </p>

      <RegulationSegmentedControl
        regulationId={record.regulation_id}
        onChange={select}
        isDisabled={isUpdating}
      />
    </div>
  );
}
