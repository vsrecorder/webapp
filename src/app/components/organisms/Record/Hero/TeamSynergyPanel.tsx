import { TeamStats } from "@app/utils/matchStats";

type Props = {
  team: TeamStats;
};

// これ以下の絶対値は「個人とチームの勝敗が連動していない」とみなす。
// 0ぴったりでなくても、わずかな相関を色付きで断言しないための遊び。
const PHI_NEUTRAL_THRESHOLD = 0.05;

export type PhiTone = "positive" | "negative" | "neutral";

/*
 * φ係数の色調(貢献度が正 / 負 / 連動なし)を判定する。
 * パネル本体の値・メーターと、パネル背景の glow で同じ判定を使うため切り出している。
 * 算出できない(null)ときは中立扱い。
 */
export function phiTone(phi: number | null): PhiTone {
  if (phi === null || Math.abs(phi) <= PHI_NEUTRAL_THRESHOLD) return "neutral";
  return phi > 0 ? "positive" : "negative";
}

/*
 * 戦績パネルの裏面(チーム戦のみ)。個人の勝敗とチームの勝敗の連動を φ係数で表す。
 *
 *   φ = (ad - bc) / √((a+b)(c+d)(a+c)(b+d))
 *
 * +1に近いほど「自分が勝った試合ほどチームも勝っている」= チーム結果への貢献が大きい。
 * 0付近は「自分の勝敗とチームの勝敗が無関係」、負の値は逆に噛み合っていないことを示す。
 *
 * ただし1記録ぶんの数戦では値が大きく振れる(偶然でも±0.4程度は普通に出る)ため、
 * 確定した数字と受け取られないようベータ表示にしている。
 */
export default function TeamSynergyPanel({ team }: Props) {
  const { phi } = team;

  // φを -1〜+1 のメーター上の位置(0〜100%)へ写す
  const markerPercent = phi === null ? 50 : ((phi + 1) / 2) * 100;

  // 値・マーカーの色。パネル背景の glow と同じ判定を使う
  const tone = phiTone(phi);
  const valueClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-danger"
        : "text-default-500";
  const markerClass =
    tone === "positive"
      ? "bg-success"
      : tone === "negative"
        ? "bg-danger"
        : "bg-default-400";

  return (
    <div className="flex w-full flex-col items-center">
      {/* ベータ表示。指標の性格上、確定した数字だと受け取られないよう先頭に置く */}
      <span className="rounded-sm bg-warning/15 px-1 py-px text-[8px] font-bold leading-tight text-warning">
        BETA
      </span>

      {/* 指標名。数値だけでは単位が伝わらないため、記号を添えて「φ係数」だと分かるようにする */}
      <div className="mt-1.5 flex items-center gap-1">
        <span className="text-[9px] font-bold tracking-wide text-default-400">貢献度</span>
        <span className="text-[10px] font-bold italic text-default-400">φ</span>
      </div>

      {/* φの値 */}
      <span className={`mt-1 text-3xl font-bold tabular-nums ${valueClass}`}>
        {phi === null ? "—" : phi.toFixed(2)}
      </span>

      {/* -1〜+1 のメーター。中央(0=無相関)からどちら側にどれだけ振れているかを見せる */}
      <div className="mt-2.5 w-full">
        <div className="relative h-1.5 w-full rounded-full bg-default-200">
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-default-300"
          />
          {phi !== null && (
            <span
              aria-hidden
              className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-content1 ${markerClass}`}
              style={{ left: `${markerPercent}%` }}
            />
          )}
        </div>
        <div className="mt-1 flex justify-between text-[8px] font-bold tabular-nums text-default-400">
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
        </div>
      </div>
    </div>
  );
}
