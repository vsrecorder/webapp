import { MatchResult } from "@app/utils/matchStats";

type Props = {
  // 勝敗の時系列(1戦目 → 最終戦)
  results: MatchResult[];
};

/*
 * 勝敗の推移を W(勝ち=success) / L(負け=danger) のドット列で表す。
 * 左が1戦目、右が最終戦。対戦数が多い場合は折り返す。
 */
export default function MatchStreak({ results }: Props) {
  if (results.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {results.map((r, i) => (
        <span
          key={i}
          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7.5px] font-bold text-white ${
            r === "win" ? "bg-success" : "bg-danger"
          }`}
        >
          {r === "win" ? "W" : "L"}
        </span>
      ))}
    </div>
  );
}
