// リングを描く座標系。実サイズは親の幅に追従させ、SVG が viewBox ごと拡縮する。
const VIEWBOX = 100;

type Props = {
  // 勝率(0〜100)
  winRate: number;
  // リングの太さ(VIEWBOX=100 に対する比率。10 なら直径の10%)
  strokeWidth?: number;
};

/*
 * 勝率を表す円形リング。SVGの円弧で勝率ぶんを success 色で描き、
 * 残りを danger の薄いトラックで示す。中央に勝率%を表示する。
 *
 * 直径は固定せず、親要素の幅いっぱいに広がる(常に正方形)。カード幅が
 * 端末・シェア画像・モーダルで変わるため、リング側は比率だけを持ち、
 * 実寸の決定は親(RecordStatPanel)に委ねる。
 * 中央のテキストもリング径に対する比率で決めたいので、コンテナクエリ単位(cqw)を使う。
 */
export default function WinRateRing({ winRate, strokeWidth = 10 }: Props) {
  const radius = (VIEWBOX - strokeWidth) / 2;
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
      // container-type: inline-size でこの要素自身をコンテナにし、
      // 中央テキストの font-size を自身の幅の割合(cqw)で指定できるようにする
      style={{ containerType: "inline-size" }}
      className="relative aspect-square w-full shrink-0"
      role="img"
      aria-label={`勝率 ${winRate}パーセント`}
    >
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-full w-full -rotate-90">
        {/* トラック(残りぶん) */}
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={radius}
          fill="none"
          stroke={trackStroke}
          strokeWidth={strokeWidth}
        />
        {/* 勝率ぶんの円弧 */}
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
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
        {/* 従来の size * 0.27 / 8px 相当を、リング径に対する比率で表現する */}
        <span className="font-bold tabular-nums" style={{ fontSize: "27cqw" }}>
          {winRate}%
        </span>
        <span
          className="mt-0.5 font-bold tracking-wide text-default-400"
          style={{ fontSize: "8.5cqw" }}
        >
          勝率
        </span>
      </div>
    </div>
  );
}
