"use client";

/*
 * デッキの先攻/後攻の内訳（割合・勝率）を2ボックスで並べるグリッド。
 *
 * デッキ一覧カード（DeckCard のリスト・ギャラリー両方）と、
 * /kizuna プロモのモック（KizunaDeckCardPreview）で共有する。
 * 同じ見た目を各所に手で書くと、片方だけ実態とずれる（勝率が色分けされない・
 * 全体差が出ない等）。1コンポーネントにまとめて、ずれを構造的に防ぐ。
 *
 * 呼び出し側は「先攻/後攻の試行があるか（game_count > 0）」を判定してから出すこと。
 */

// 小数点第1位までにフォーマットし、割り切れる場合の末尾".0"を落とす（"50.0"→"50"）
function trimTrailingZeroDecimal(value: string): string {
  return value.endsWith(".0") ? value.slice(0, -2) : value;
}

function formatPercent(rate: number): string {
  return `${trimTrailingZeroDecimal((rate * 100).toFixed(1))}%`;
}

// 勝率に応じた色分け（UserStatPanel などの勝率表示と同じ閾値）
function winRateTextColor(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
}

// 先攻時/後攻時の勝率が、デッキ全体の勝率からどれだけ離れているかをポイント差で表す。
function formatWinRateDeviation(rate: number, overallWinRate: number) {
  const diffPt = Math.round((rate - overallWinRate) * 1000) / 10;
  const absLabel = trimTrailingZeroDecimal(Math.abs(diffPt).toFixed(1));

  return {
    label: diffPt === 0 ? "±0" : diffPt > 0 ? `+${absLabel}` : `-${absLabel}`,
    colorClass:
      diffPt > 0 ? "text-success" : diffPt < 0 ? "text-danger" : "text-default-400",
  };
}

// 勝率が 0% または 100% のときは母数が少なく全体差の情報価値が乏しいため出さない。
function deviationOf(winRate: number, overallWinRate: number, hasStats: boolean) {
  if (!hasStats || winRate <= 0 || winRate >= 1) return null;
  return formatWinRateDeviation(winRate, overallWinRate);
}

// 先攻・後攻いずれかの1ボックス
function GoBox({
  label,
  count,
  rate,
  hasStats,
  winRate,
  deviation,
}: {
  label: string;
  count: number;
  rate: number;
  hasStats: boolean;
  winRate: number;
  deviation: { label: string; colorClass: string } | null;
}) {
  return (
    <div className="rounded-lg bg-default-100 px-2.5 py-2">
      <div className="text-tiny font-bold text-default-600 mb-1">{label}</div>
      <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
        <span className="text-default-400">割合</span>
        <span className="text-right text-default-600">
          {count > 0 ? (
            <>
              {formatPercent(rate)}
              <span className="text-default-400">（{count}件）</span>
            </>
          ) : (
            "-"
          )}
        </span>
        <span className="text-default-400">勝率</span>
        <span
          className={`text-right font-bold ${
            hasStats ? winRateTextColor(winRate) : "text-default-500"
          }`}
        >
          {hasStats ? formatPercent(winRate) : "-"}
          {deviation && (
            <span className={`ml-1 text-[10px] font-semibold ${deviation.colorClass}`}>
              （全体差 {deviation.label}）
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

type Props = {
  // デッキ全体の勝率（全体差の基準）
  winRate: number;
  goFirstCount: number;
  goFirstRate: number;
  goFirstWinRate: number;
  goSecondCount: number;
  goSecondWinRate: number;
};

export default function DeckGoStatsGrid({
  winRate,
  goFirstCount,
  goFirstRate,
  goFirstWinRate,
  goSecondCount,
  goSecondWinRate,
}: Props) {
  const goFirstHasStats = goFirstCount > 0;
  const goSecondHasStats = goSecondCount > 0;

  return (
    <div className="grid grid-cols-2 gap-2">
      <GoBox
        label="先攻"
        count={goFirstCount}
        rate={goFirstRate}
        hasStats={goFirstHasStats}
        winRate={goFirstWinRate}
        deviation={deviationOf(goFirstWinRate, winRate, goFirstHasStats)}
      />
      <GoBox
        label="後攻"
        count={goSecondCount}
        // 後攻割合は先攻割合の裏返し（後攻専用の割合は保持していない）
        rate={1 - goFirstRate}
        hasStats={goSecondHasStats}
        winRate={goSecondWinRate}
        deviation={deviationOf(goSecondWinRate, winRate, goSecondHasStats)}
      />
    </div>
  );
}
