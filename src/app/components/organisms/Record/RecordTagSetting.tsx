"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

import { addToast } from "@heroui/react";

import { LuTag } from "react-icons/lu";

import TagSelector from "@app/components/organisms/Tag/TagSelector";
import { updateRecordFields } from "@app/components/organisms/Record/updateRecord";
import { RECORD_SETTING_DESCRIPTIONS } from "@app/components/organisms/Record/recordSettings";

import { RecordGetByIdResponseType } from "@app/types/record";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  // ボードのパネル内に置く場合は true。外側のカード枠(border/bg/影/余白)を外す。
  flat?: boolean;
  // 説明文を出すか。パネルの見出し(「?」の吹き出し)や編集シート側に説明を置く場合は false。
  showDescription?: boolean;
  // 保存APIの実行中かどうかを親へ通知する。
  // モーダル内で使う場合、更新中に閉じられて結果が見えなくなるのを防ぐために使う。
  onUpdatingChange?: (isUpdating: boolean) => void;
};

// タグIDの集合を「並びも含めて」比較する。並びは付与順=表示順なので、
// 同じ集合でも並べ替えは変更として扱う(デッキ・対戦結果の編集と同じ規約)。
function sameTagIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/*
 * 記録に付けるタグの設定カード。
 * 記録詳細ページと記録情報モーダルの双方で同一UIを使い、レギュレーション・戦績集計と
 * 同じく選択と同時にAPIへ即時反映する。
 *
 * プリセットは大会順位(優勝・ベスト4 など)を出す。ACE SPECは使用カードのラベルで
 * 記録には関係しないため、記録の付与UIには出さない。
 */
export default function RecordTagSetting({
  record,
  setRecord,
  flat = false,
  showDescription = true,
  onUpdatingChange,
}: Props) {
  const [tagIds, setTagIds] = useState<string[]>(() =>
    (record.tags ?? []).map((tag) => tag.id),
  );
  const [isSaving, setIsSaving] = useState(false);

  // 保存リクエストの組み立てには記録の最新値が要る(他の設定の更新で差し替わるため)。
  const recordRef = useRef(record);
  recordRef.current = record;

  // 保存したい最新の集合。保存中にさらに操作されても取りこぼさないよう ref で持つ。
  const desiredRef = useRef<string[]>(tagIds);
  const inFlightRef = useRef(false);

  // 記録が外から差し替わったとき(別の記録を開いた等)に追従する。
  // 保存中は自分が投げた更新が返ってくるだけなので、ローカルの状態を優先する。
  useEffect(() => {
    if (inFlightRef.current) return;

    const next = (record.tags ?? []).map((tag) => tag.id);
    if (sameTagIds(next, desiredRef.current)) return;

    desiredRef.current = next;
    setTagIds(next);
  }, [record.tags]);

  function updateIsSaving(next: boolean) {
    setIsSaving(next);
    onUpdatingChange?.(next);
  }

  async function flush() {
    // 既に保存中なら、そのループが desiredRef を読み直して続きを送る。
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    updateIsSaving(true);

    try {
      // 送信中にさらに操作されたら最新の集合でもう一度送り、最後の操作を必ず残す。
      for (;;) {
        const target = desiredRef.current;

        const ret = await updateRecordFields(recordRef.current, {
          tag_ids: target,
        });
        setRecord((prev) => (prev ? { ...prev, tags: ret.tags } : prev));

        if (sameTagIds(desiredRef.current, target)) break;
      }
    } catch (error) {
      console.error(error);

      // 保存できなかった分は、サーバ上の状態(=直前の記録)へ戻す。
      const rollback = (recordRef.current.tags ?? []).map((tag) => tag.id);
      desiredRef.current = rollback;
      setTagIds(rollback);

      addToast({
        title: "変更失敗",
        description: "タグの変更に失敗しました",
        color: "danger",
        timeout: 5000,
      });
    } finally {
      inFlightRef.current = false;
      updateIsSaving(false);
    }
  }

  function handleChange(next: string[]) {
    // 先に画面へ反映してから保存する(チップの反応を待たせない)。
    setTagIds(next);
    desiredRef.current = next;

    void flush();
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
            <LuTag className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-bold">この記録のタグ</span>
        </div>
      )}

      {/* 説明を出さない場合も、保存中の表示は残す(タグの付け外しは即時反映のため) */}
      {(showDescription || isSaving) && (
        <div
          className={`mb-2.5 flex items-center justify-between gap-2 ${flat ? "" : "mt-1"}`}
        >
          {showDescription ? (
            <p className="text-tiny text-default-500">{RECORD_SETTING_DESCRIPTIONS.tag}</p>
          ) : (
            <span />
          )}
          {isSaving && (
            <span className="shrink-0 text-[0.625rem] text-default-400">保存中…</span>
          )}
        </div>
      )}

      <TagSelector
        selectedTagIds={tagIds}
        onChange={handleChange}
        showLabel={false}
        presetCategory="placement"
      />
    </div>
  );
}
