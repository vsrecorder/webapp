"use client";

import { useRegulations } from "@app/hooks/useRegulations";

type Props = {
  regulationId: number;
  onChange: (regulationId: number) => void;
  // 更新API実行中など、操作を受け付けたくない間は true
  isDisabled?: boolean;
  ariaLabel?: string;
};

/*
 * レギュレーション(スタンダード/エクストラ/殿堂)を選ぶセグメントコントロール。
 * 記録の作成フォーム・記録詳細の設定・戦績分析の絞り込みで同じ見た目を共有し、
 * 「この形＝レギュレーションの選択」と分かるようにしている。
 *
 * 選択肢は useRegulations が返すマスタ。マスタが引けないときもフォールバックの
 * 3件が返るため、選択肢が空になることはない。
 */
export default function RegulationSegmentedControl({
  regulationId,
  onChange,
  isDisabled = false,
  ariaLabel = "レギュレーション",
}: Props) {
  const regulations = useRegulations();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-3 gap-1 rounded-xl border border-divider bg-default-100 p-1"
    >
      {regulations.map((regulation) => {
        const selected = regulation.id === regulationId;

        return (
          <button
            key={regulation.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={isDisabled}
            onClick={() => onChange(regulation.id)}
            className={`flex items-center justify-center rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
              selected
                ? "bg-content1 text-primary shadow-sm"
                : "text-default-500 hover:text-default-700"
            }`}
          >
            {regulation.name}
          </button>
        );
      })}
    </div>
  );
}
