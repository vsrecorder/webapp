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
 * レギュレーション(スタンダード/エクストラ/殿堂/その他)を選ぶセグメントコントロール。
 * 記録の作成フォーム・記録詳細の設定・戦績分析の絞り込みで同じ見た目を共有し、
 * 「この形＝レギュレーションの選択」と分かるようにしている。
 *
 * 選択肢は useRegulations が返すマスタ。マスタが引けないときもフォールバックが
 * 返るため、選択肢が空になることはない。
 *
 * 選択肢は件数によらず横一列に並べる。列数はマスタの件数から作る
 * (Tailwind の grid-cols-N はクラス名を動的に組めないため style で指定する)。
 */
export default function RegulationSegmentedControl({
  regulationId,
  onChange,
  isDisabled = false,
  ariaLabel = "レギュレーション",
}: Props) {
  const regulations = useRegulations();
  // 4件を横に並べると、狭い端末(360px幅)では「スタンダード」が2行に割れる。
  // 件数が増えたときだけ字と余白を詰めて、1行に収める。
  const isCompact = regulations.length >= 4;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-1 rounded-xl border border-divider bg-default-100 p-1"
      style={{
        gridTemplateColumns: `repeat(${regulations.length}, minmax(0, 1fr))`,
      }}
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
            className={`flex items-center justify-center whitespace-nowrap rounded-lg py-2 font-bold transition-colors ${
              isCompact ? "px-1 text-[0.6875rem]" : "px-2 text-xs"
            } ${
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
