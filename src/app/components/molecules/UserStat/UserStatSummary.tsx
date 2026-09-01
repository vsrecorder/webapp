"use client";

import { UserStatType } from "@app/types/user_stat";

// 戦績分析の数値表示（対戦記録・イベント種別・試合数・勝敗・勝率）。
// 画面のパネル(UserStatPanel)とシェア画像(UserStatShareCard)の両方から使い、
// 同じ記録が画面と画像で違って見えることがないようにする。

function WinRateDisplay({ winRate, isLoading }: { winRate: number; isLoading: boolean }) {
  const pct = (winRate * 100).toFixed(1);
  const color =
    winRate === 0
      ? "text-default-500"
      : winRate >= 0.55
        ? "text-success"
        : winRate >= 0.45
          ? "text-default-500"
          : winRate >= 0.4
            ? "text-warning"
            : "text-danger";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[0.625rem] font-bold text-default-400 uppercase tracking-wider">
        勝率
      </span>
      <span
        className={`text-4xl font-black tabular-nums transition-opacity duration-300 ${isLoading ? "opacity-30" : "opacity-100"} ${color}`}
      >
        {pct}
        <span className="text-xl font-bold">%</span>
      </span>
    </div>
  );
}

function StatCell({
  label,
  value,
  isLoading,
  suffix,
}: {
  label: string;
  value: number;
  isLoading: boolean;
  // 値の右隣に小さく添える補足(試合数に対する引き分け数「（N分）」など)
  suffix?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-3 rounded-xl bg-default-100">
      <span className="text-[0.625rem] font-bold text-default-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="flex items-baseline gap-0.5">
        <span
          className={`text-xl font-black tabular-nums transition-opacity duration-300 ${isLoading ? "opacity-30" : "opacity-100"}`}
        >
          {value.toLocaleString("ja-JP")}
        </span>
        {!isLoading && suffix}
      </span>
    </div>
  );
}

type Props = {
  stat: UserStatType | null;
  isLoading: boolean;
};

// 試合数 = 勝利 + 敗北 + 引き分け。勝敗の合計と試合数が食い違う分を引き分け数とする。
export function drawCount(stat: UserStatType | null): number {
  return Math.max(
    0,
    (stat?.total_matches ?? 0) - (stat?.wins ?? 0) - (stat?.losses ?? 0),
  );
}

export default function UserStatSummary({ stat, isLoading }: Props) {
  const draws = drawCount(stat);

  return (
    <>
      <StatCell label="対戦記録" value={stat?.total_records ?? 0} isLoading={isLoading} />
      <div className="grid grid-cols-3 gap-2">
        <StatCell
          label="公式イベント"
          value={stat?.official_event_count ?? 0}
          isLoading={isLoading}
        />
        <StatCell
          label="Tonamel"
          value={stat?.tonamel_event_count ?? 0}
          isLoading={isLoading}
        />
        <StatCell
          label="自由形式"
          value={stat?.unofficial_event_count ?? 0}
          isLoading={isLoading}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCell
          label="試合数"
          value={stat?.total_matches ?? 0}
          isLoading={isLoading}
          // 引き分け数を右隣に「（N分）」で表示し、内訳が分かるようにする
          suffix={
            draws > 0 ? (
              <span title="引き分け" className="text-[0.625rem] font-bold text-default-400">
                （{draws}分）
              </span>
            ) : null
          }
        />
        <StatCell label="勝利" value={stat?.wins ?? 0} isLoading={isLoading} />
        <StatCell label="敗北" value={stat?.losses ?? 0} isLoading={isLoading} />
      </div>

      <WinRateDisplay winRate={stat?.win_rate ?? 0} isLoading={isLoading} />
    </>
  );
}
