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
            /*
             * 高さを決め打ちしないぶん、行の高さ(leading-4)と枠(border)は明示する。
             *
             * ・leading を省くと text-[0.6875rem] の行が 16.5px になり、骨格と 0.5px ずれる。
             * ・`border-transparent` は見た目のためではなく、globals.css の
             *   `.dark .bg-content1:not([class*="border"])` から外れるために要る。この規則は
             *   カード用の補助枠だが、選択色に bg-content1 を使うこのセグメントにも当たり、
             *   ダークのときだけ選択中の1つが 1px の枠ぶん高くなっていた(格子は高い方に
             *   揃うのでコントロール全体が 42.5px → 44.5px に変わる)。
             *   なお枠が出ていたのはカードの外に置いたときだけで、カードの中では
             *   入れ子用の `border: none` が効いて出ていなかった(=大半の画面では枠なし)。
             *   透明な枠に統一して、置き場所とテーマによらず 34px にする。
             */
            className={`flex items-center justify-center whitespace-nowrap rounded-lg border border-transparent py-2 font-bold leading-4 transition-colors ${
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
