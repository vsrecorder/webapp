"use client";

import { LuSquare, LuSquareCheck } from "react-icons/lu";

/*
 * 不戦勝・不戦敗を戦績集計に含めるかの切り替え(既定は外す。utils/excludeDefaultMatches)。
 *
 * 除外は勝率の分母だけでなく試合数・勝利・敗北のすべてに効く
 * (対戦が存在しない以上、1戦として数える根拠がないため)。
 *
 * トレーナー情報パネルと戦績分析パネルで同じ部品を使う。設定が1つなのに操作する場所ごとに
 * 見た目が違うと、別々の設定に見えてしまうため。
 */
export default function ExcludeDefaultMatchesToggle({
  excluded,
  onToggle,
  // 置き場所ごとの余白。面の作り(高さ・色)は共通のまま、間隔だけ呼び出し側で決める
  className = "",
}: {
  excluded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={excluded}
      className={`${className} flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 transition-colors ${
        excluded
          ? "bg-primary-50 text-primary-600 hover:bg-primary-100"
          : "text-default-400 hover:bg-default-100"
      }`}
    >
      {excluded ? (
        <LuSquareCheck className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <LuSquare className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="text-[0.625rem] font-bold">不戦勝・不戦敗を除いて集計する</span>
    </button>
  );
}
