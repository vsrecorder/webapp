// リングを描く座標系。実サイズは親の幅に追従させ、SVG が viewBox ごと拡縮する。
const VIEWBOX = 100;

// リングの太さ。チーム戦(2重リング)では内周ぶんの余白を作るため細くする。
const SINGLE_STROKE = 10;
const DUAL_STROKE = 7;

// 2重リングの外周と内周の間隔
const RING_GAP = 5;

/*
 * 勝率に連動したゲージ色を返す。勝ち越し(50%以上)は success、負け越しは danger。
 * トラックは同系色の薄い版にして単色のリングにする。
 * html-to-image では SVG の currentColor + Tailwind クラスが画像に反映されない
 * ことがあるため、stroke は CSS 変数を直接指定して確実に色を出す。
 *
 * 戦績パネル側でも凡例のドット色をリングと揃えるために使う。
 */
export function winRateColors(winRate: number) {
  const isPositive = winRate >= 50;
  return {
    gauge: isPositive ? "hsl(var(--heroui-success))" : "hsl(var(--heroui-danger))",
    track: isPositive
      ? "hsl(var(--heroui-success) / 0.15)"
      : "hsl(var(--heroui-danger) / 0.15)",
  };
}

type RingProps = {
  radius: number;
  strokeWidth: number;
  winRate: number;
};

// 勝率ぶんの円弧＋残りのトラックを1本ぶん描く
function Ring({ radius, strokeWidth, winRate }: RingProps) {
  const circumference = 2 * Math.PI * radius;
  // 勝率ぶんだけ円弧を見せる(dashoffset は残りの長さ)
  const dashOffset = circumference * (1 - Math.min(Math.max(winRate, 0), 100) / 100);
  const { gauge, track } = winRateColors(winRate);

  return (
    <>
      {/* トラック(残りぶん) */}
      <circle
        cx={VIEWBOX / 2}
        cy={VIEWBOX / 2}
        r={radius}
        fill="none"
        stroke={track}
        strokeWidth={strokeWidth}
      />
      {/* 勝率ぶんの円弧 */}
      <circle
        cx={VIEWBOX / 2}
        cy={VIEWBOX / 2}
        r={radius}
        fill="none"
        stroke={gauge}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
      />
    </>
  );
}

type Props = {
  // 個人の勝率(0〜100)
  winRate: number;
  // チームの勝率(0〜100)。チーム戦の記録で指定すると外周にもう1本リングを描く
  teamWinRate?: number;
};

/*
 * 勝率を表す円形リング。SVGの円弧で勝率ぶんを success 色で描き、
 * 残りを danger の薄いトラックで示す。中央に勝率%を表示する。
 *
 * チーム戦(teamWinRate 指定時)は外周にチーム勝率、内周に個人勝率の2重リングにする。
 * 色は勝率ごとに独立して決まるため、「外が赤・内が緑 = チームは負け越したが自分は勝ち越した」
 * のように、2本の円弧の色と長さの差でチームと個人の食い違いが読める。
 *
 * 直径は固定せず、親要素の幅いっぱいに広がる(常に正方形)。カード幅が
 * 端末・シェア画像・モーダルで変わるため、リング側は比率だけを持ち、
 * 実寸の決定は親(RecordStatPanel)に委ねる。
 * 中央のテキストもリング径に対する比率で決めたいので、コンテナクエリ単位(cqw)を使う。
 */
export default function WinRateRing({ winRate, teamWinRate }: Props) {
  const isDual = teamWinRate !== undefined;
  const strokeWidth = isDual ? DUAL_STROKE : SINGLE_STROKE;

  const outerRadius = (VIEWBOX - strokeWidth) / 2;
  const innerRadius = outerRadius - strokeWidth - RING_GAP;

  return (
    <div
      // container-type: inline-size でこの要素自身をコンテナにし、
      // 中央テキストの font-size を自身の幅の割合(cqw)で指定できるようにする
      style={{ containerType: "inline-size" }}
      className="relative aspect-square w-full shrink-0"
      role="img"
      aria-label={
        isDual
          ? `チーム勝率 ${teamWinRate}パーセント、個人勝率 ${winRate}パーセント`
          : `勝率 ${winRate}パーセント`
      }
    >
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-full w-full -rotate-90">
        {isDual ? (
          <>
            {/* 外周: チーム勝率 */}
            <Ring radius={outerRadius} strokeWidth={strokeWidth} winRate={teamWinRate} />
            {/* 内周: 個人勝率 */}
            <Ring radius={innerRadius} strokeWidth={strokeWidth} winRate={winRate} />
          </>
        ) : (
          <Ring radius={outerRadius} strokeWidth={strokeWidth} winRate={winRate} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {/* 従来の size * 0.27 / 8px 相当を、リング径に対する比率で表現する。
            2重リングは内周の中に収める必要があるため、数字を一回り小さくする */}
        <span
          className="font-bold tabular-nums"
          style={{ fontSize: isDual ? "22cqw" : "27cqw" }}
        >
          {winRate}%
        </span>
        <span
          className="mt-0.5 font-bold tracking-wide text-default-400"
          style={{ fontSize: "8.5cqw" }}
        >
          {isDual ? "個人勝率" : "勝率"}
        </span>
      </div>
    </div>
  );
}
