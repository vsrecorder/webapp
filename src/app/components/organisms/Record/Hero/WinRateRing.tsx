type Props = {
  // 勝率(0〜100)
  winRate: number;
  // リングの直径(px)
  size?: number;
  // リングの太さ(px)
  strokeWidth?: number;
};

/*
 * 勝率を表す円形リング。SVGの円弧で勝率ぶんを success 色で描き、
 * 残りを danger の薄いトラックで示す(currentColor + Tailwind で
 * ライト/ダーク両テーマに追従)。中央に勝率%を表示する。
 */
export default function WinRateRing({ winRate, size = 92, strokeWidth = 10 }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 勝率ぶんだけ円弧を見せる(dashoffset は残りの長さ)
  const dashOffset = circumference * (1 - Math.min(Math.max(winRate, 0), 100) / 100);

  // ゲージ色は勝率に連動：勝ち越し(50%以上)は success、負け越しは danger。
  // トラックは同系色の薄い版にして単色のリングにする。
  // html-to-image では SVG の currentColor + Tailwind クラスが画像に反映されない
  // ことがあるため、stroke は CSS 変数を直接指定して確実に色を出す。
  const isPositive = winRate >= 50;
  const gaugeStroke = isPositive
    ? "hsl(var(--heroui-success))"
    : "hsl(var(--heroui-danger))";
  const trackStroke = isPositive
    ? "hsl(var(--heroui-success) / 0.15)"
    : "hsl(var(--heroui-danger) / 0.15)";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`勝率 ${winRate}パーセント`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* トラック(残りぶん) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackStroke}
          strokeWidth={strokeWidth}
        />
        {/* 勝率ぶんの円弧 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gaugeStroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-bold tabular-nums" style={{ fontSize: size * 0.27 }}>
          {winRate}%
        </span>
        <span className="mt-0.5 text-[8px] font-bold tracking-wide text-default-400">
          勝率
        </span>
      </div>
    </div>
  );
}
