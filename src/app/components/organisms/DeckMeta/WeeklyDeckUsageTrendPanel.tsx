"use client";

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import { Card, CardBody } from "@heroui/react";
import { LuChartSpline, LuLayers } from "react-icons/lu";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import FetchError from "@app/components/molecules/FetchError";
import WeeklyDeckUsageTrendMembersSheet from "@app/components/organisms/DeckMeta/WeeklyDeckUsageTrendMembersSheet";

import {
  initialTrendRange,
  loadWeeklyDeckUsageTrend,
  peekWeeklyDeckUsageTrend,
  prefetchWeeklyDeckUsageTrendMembers,
  trendWeekOptions,
} from "@app/components/organisms/DeckMeta/weeklyDeckUsageTrendLoader";

import {
  changeTrendRangeEdge,
  DECK_USAGE_TREND_MAX_WEEKS,
  DECK_USAGE_TREND_MIN_WEEKS,
  DeckUsageTrendRange,
  trendSeriesColor,
  trendWeekCount,
} from "@app/utils/weeklyDeckUsageTrend";
import {
  WeeklyDeckUsageTrendSeriesType,
  WeeklyDeckUsageTrendType,
} from "@app/types/weekly_deck_usage_trend";

// 1順位ぶんの行の高さ(px)と、左右の「順位＋スプライト」の列幅(px)
const ROW = 28;
const SPRITE = 26;
const SIDE = 48;
// 線の両端が左右の列に食い込まないよう、描画域の左右に取る余白(px)
const X_PAD = 6;
// 週の目盛りの文字("12/28" で約26px)どうしが重ならない最小の間隔(px)。
// 週数が多く間隔がこれより狭いときは、最新の週から数えて間引く
const MIN_LABEL_GAP = 32;

// "2026-09-14" → "9/14"
function shortDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

function formatRate(rate: number | null): string {
  return rate == null ? "―" : `${(rate * 100).toFixed(1)}%`;
}

/*
 * 系列の線(週ごとの点を、各点で水平になるS字の曲線でつなぐ)。
 * 範囲外(limit 位より下・その週に無い)の点は描画域の下の外に置き、線が下端から
 * 抜けていく/入ってくる見え方にする(描画域の外は SVG が切り取る)。
 */
function seriesPath(
  s: WeeklyDeckUsageTrendSeriesType,
  xs: number[],
  limit: number,
): string {
  const y = (rank: number | null) =>
    rank != null && rank <= limit ? (rank - 0.5) * ROW : (limit + 1.5) * ROW;
  const ys = s.points.map((p) => y(p.rank));

  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const mid = (xs[i - 1] + xs[i]) / 2;
    d += ` C${mid},${ys[i - 1]} ${mid},${ys[i]} ${xs[i]},${ys[i]}`;
  }
  return d;
}

// 期間の端を選ぶセレクト(ランキングの週セレクタと同じ見た目)
function WeekSelect({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="px-1 text-[0.625rem] font-bold text-default-400">{label}</span>
      <span className="relative">
        <select
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 py-2 pl-3 pr-7 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.625rem] text-default-400">
          ▼
        </span>
      </span>
    </label>
  );
}

/*
 * 線と左右の列は、系列ごと・順位ごとの部品に分けて memo する。
 * 線をタップ(またはマウスを載せる)たびに全部を描き直すと、系列の数(50〜70本)ぶんの
 * 線と60個のスプライトを毎回作り直すことになる。
 *
 * 線は描く順番を固定し、選択が変わっても一切作り直さない。強調中の線は、全部の線の上に
 * 同じ線をもう1本(ActiveSeriesLine)重ねて描き、ほかの線を薄くするのは svg に付けた
 * クラス(CSS)に任せる。強調中の線を並びの末尾へ動かす方式だと、強調を外して元の位置へ
 * 戻すたびに、後ろにある線が軒並み移動扱いになって DOM を組み替えていた(実測で1回125件)。
 */
type SeriesLineType = {
  fingerprint: string;
  d: string;
  dots: { cx: number; cy: number }[];
  color: string;
};

const SeriesLine = memo(function SeriesLine({
  fingerprint,
  d,
  dots,
  color,
  onToggle,
  onHover,
}: SeriesLineType & {
  onToggle: (fingerprint: string) => void;
  onHover: (fingerprint: string | null) => void;
}) {
  return (
    // 強調中は svg 側のクラスで .trend-series を全部薄くする(強調する線は上に重ねて描く)
    <g className="trend-series transition-opacity duration-150">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={2.5} fill={color} />
      ))}
      {/* 線より太い透明の当たり判定(細い線は指でタップしにくい) */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(fingerprint);
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && onHover(fingerprint)}
        onPointerLeave={(e) => e.pointerType === "mouse" && onHover(null)}
      />
    </g>
  );
});

// 強調中の線。全部の線の上に太く重ねる
function ActiveSeriesLine({
  line,
  interactive,
  onToggle,
}: {
  line: SeriesLineType;
  // タップで固定しているとき。当たり判定を持たせて、もう一度タップすると外せるようにする。
  // マウスを載せているだけのときは持たせない(重ねた線の下へポインタが潜ったことになり、
  // 元の線から離れた扱いで強調が外れ、また載って強調される、を繰り返してしまう)
  interactive: boolean;
  onToggle: (fingerprint: string) => void;
}) {
  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={line.d}
        fill="none"
        stroke={line.color}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      {line.dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={3.5} fill={line.color} />
      ))}
      {interactive && (
        <path
          d={line.d}
          fill="none"
          stroke="transparent"
          strokeWidth={12}
          style={{ pointerEvents: "stroke", cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(line.fingerprint);
          }}
        />
      )}
    </g>
  );
}

type EdgeEntry = { fingerprint: string; spriteId?: string };

const EdgeItem = memo(function EdgeItem({
  rank,
  entry,
  side,
  isActive,
  onToggle,
  onHover,
}: {
  rank: number;
  entry?: EdgeEntry;
  side: "left" | "right";
  isActive: boolean;
  onToggle: (fingerprint: string) => void;
  onHover: (fingerprint: string | null) => void;
}) {
  return (
    <button
      type="button"
      disabled={!entry}
      onClick={() => entry && onToggle(entry.fingerprint)}
      onPointerEnter={(e) =>
        entry && e.pointerType === "mouse" && onHover(entry.fingerprint)
      }
      onPointerLeave={(e) => e.pointerType === "mouse" && onHover(null)}
      aria-label={entry ? `${rank}位の推移を表示` : undefined}
      // 強調中でない行を薄くするのは列側のクラス(data-active の無い data-edge)
      data-edge=""
      data-active={isActive || undefined}
      className={`absolute inset-x-0 flex items-center transition-opacity ${
        side === "left" ? "flex-row" : "flex-row-reverse"
      }`}
      style={{ top: (rank - 1) * ROW, height: ROW }}
    >
      <span className="w-5 text-center text-[0.625rem] font-bold tabular-nums text-default-400">
        {rank}
      </span>
      {entry ? (
        <PokemonSprite id={entry.spriteId} size={SPRITE} loading="lazy" />
      ) : (
        <span style={{ width: SPRITE }} />
      )}
    </button>
  );
});

// 左右の「順位＋スプライト」の列
function EdgeColumn({
  byRank,
  limit,
  height,
  side,
  active,
  onToggle,
  onHover,
}: {
  byRank: Map<number, EdgeEntry>;
  limit: number;
  height: number;
  side: "left" | "right";
  active: string | null;
  onToggle: (fingerprint: string) => void;
  onHover: (fingerprint: string | null) => void;
}) {
  return (
    <div
      className={`relative shrink-0 ${
        active != null ? "[&_[data-edge]:not([data-active])]:opacity-25" : ""
      }`}
      style={{ width: SIDE, height }}
    >
      {Array.from({ length: limit }, (_, i) => {
        const entry = byRank.get(i + 1);
        return (
          <EdgeItem
            key={i + 1}
            rank={i + 1}
            entry={entry}
            side={side}
            isActive={entry != null && entry.fingerprint === active}
            onToggle={onToggle}
            onHover={onHover}
          />
        );
      })}
    </div>
  );
}

// 指定した週に上位 limit 位だった系列を「順位 → 系列」で引けるようにする
function edgeEntries(
  series: WeeklyDeckUsageTrendSeriesType[],
  weekIdx: number,
  limit: number,
): Map<number, EdgeEntry> {
  const byRank = new Map<number, EdgeEntry>();
  for (const s of series) {
    const r = s.points[weekIdx]?.rank;
    if (r != null && r <= limit) {
      byRank.set(r, { fingerprint: s.fingerprint, spriteId: s.pokemon_sprites[0]?.id });
    }
  }
  return byRank;
}

export default function WeeklyDeckUsageTrendPanel() {
  // 期間の選択肢(新しい週が先頭。今週を含む)と、選べる範囲の両端
  const weekOptions = useMemo(() => trendWeekOptions(), []);
  const latestWeek = weekOptions[0].value;
  const earliestWeek = weekOptions[weekOptions.length - 1].value;

  // 対象期間。URL の from / to があれば引き継ぐ(共有・再訪用)。無い・不正なら先週までの6週
  const searchParams = useSearchParams();
  const [range, setRange] = useState<DeckUsageTrendRange>(() =>
    initialTrendRange(searchParams),
  );

  // タブに触れた時点の先読みが届いていれば、読み込み中の表示を挟まずにそのまま描く
  const [trend, setTrend] = useState<WeeklyDeckUsageTrendType | null>(
    () => peekWeeklyDeckUsageTrend(range) ?? null,
  );
  const [isLoading, setIsLoading] = useState(() => trend == null);
  const [isError, setIsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // タップで固定した系列と、マウスを載せている系列(指紋)。固定が優先
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const active = selected ?? hovered;

  // 期間を変えたら線の選択を外す(新しい期間に同じ系列がいるとは限らず、
  // いなければ全部の線が薄いまま何も強調されない状態になる)。
  // effect で外すと古い選択のままの描画が一度挟まるので、前回の値を控えて描画中に外す
  const rangeKey = `${range.from}/${range.to}`;
  const [prevRangeKey, setPrevRangeKey] = useState(rangeKey);
  if (prevRangeKey !== rangeKey) {
    setPrevRangeKey(rangeKey);
    setSelected(null);
    setHovered(null);
  }

  function changeRange(edge: "from" | "to", value: string) {
    const next = changeTrendRangeEdge(range, edge, value, earliestWeek, latestWeek);
    setRange(next);

    // 他のパラメータ(表示中のタブ・ランキングの週など)は残したまま期間だけを書き換える
    const url = new URL(window.location.href);
    url.searchParams.set("from", next.from);
    url.searchParams.set("to", next.to);
    window.history.replaceState(window.history.state, "", url.toString());
  }

  // 線を描く中央の領域の幅。SVG の座標をpxで持つため実測する
  // (viewBox で伸縮させると線の太さや点の形まで歪む)。中央の領域そのものは SVG の幅に
  // 押し広げられうるため、左右の列を含む行全体の幅から列幅を引いて求める
  const rowRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(0);

  // 「再読み込み」を押したときだけ、控えを使わずに取り直す
  const lastReloadKey = useRef(reloadKey);

  useEffect(() => {
    const fresh = lastReloadKey.current !== reloadKey;
    lastReloadKey.current = reloadKey;

    // 届いた推移を描く。グラフの組み立ては重いので transition にして細切れに進め、
    // 期間の選択やタップなどの操作を待たせない
    const show = (data: WeeklyDeckUsageTrendType) =>
      startTransition(() => {
        setTrend(data);
        setIsError(false);
        setIsLoading(false);
      });

    // 控えに届いている期間(一度見た期間・先読み済み)は、待たずにその場で出す
    const cached = fresh ? undefined : peekWeeklyDeckUsageTrend(range);
    if (cached) {
      show(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    loadWeeklyDeckUsageTrend(range, { fresh })
      .then((data) => {
        if (!cancelled) show(data);
      })
      .catch((e) => {
        console.error(e);
        if (cancelled) return;
        setTrend(null);
        setIsError(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range, reloadKey]);

  const hasChart = trend != null && trend.series.length > 0;

  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => setPlotWidth(Math.max(0, el.clientWidth - SIDE * 2));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasChart]);

  const limit = trend?.limit ?? 30;
  const weekCount = trend?.weeks.length ?? 0;
  const chartHeight = limit * ROW;

  // 各週の x 座標(描画域の左端基準)
  const xs = useMemo(() => {
    if (weekCount < 2 || plotWidth === 0) return [];
    const step = (plotWidth - X_PAD * 2) / (weekCount - 1);
    return Array.from({ length: weekCount }, (_, i) => X_PAD + i * step);
  }, [weekCount, plotWidth]);

  const series = useMemo(() => trend?.series ?? [], [trend]);

  // 系列ごとの線の形と点。データか描画域の幅が変わったときだけ作り直す
  // (選択・マウスの出入りのたびに50〜70本ぶんの path を組み立て直さない)
  const lines = useMemo(
    () =>
      xs.length === 0
        ? []
        : series.map((s, i) => ({
            fingerprint: s.fingerprint,
            color: trendSeriesColor(i),
            d: seriesPath(s, xs, limit),
            dots: s.points.flatMap((p, w) =>
              p.rank != null && p.rank <= limit
                ? [{ cx: xs[w], cy: (p.rank - 0.5) * ROW }]
                : [],
            ),
          })),
    [series, xs, limit],
  );

  const activeLine = lines.find((l) => l.fingerprint === active);

  const activeSeries = series.find((s) => s.fingerprint === active);

  // 左端(最初の週)・右端(最新の週)に並べる「順位 → 系列」
  const leftEdge = useMemo(() => edgeEntries(series, 0, limit), [series, limit]);
  const rightEdge = useMemo(
    () => edgeEntries(series, weekCount - 1, limit),
    [series, weekCount, limit],
  );

  // memo した部品へ渡すため、どちらも描画をまたいで同じ関数にする
  const toggle = useCallback(
    (fingerprint: string) =>
      setSelected((prev) => (prev === fingerprint ? null : fingerprint)),
    [],
  );
  const hover = useCallback((fingerprint: string | null) => setHovered(fingerprint), []);

  // 選んだ系列の組み合わせの内訳シート。線やポケモンをタップで選んだ時点で内訳を先読みし、
  // 「内訳」を押したときには届いているようにする(マウスを載せているだけでは取らない)
  const [membersOpen, setMembersOpen] = useState(false);
  useEffect(() => {
    if (selected) prefetchWeeklyDeckUsageTrendMembers(range, selected);
  }, [selected, range]);
  const selectedSeries = series.find((s) => s.fingerprint === selected) ?? null;
  // シートが閉じる動きの間も中身を保つため、最後に選んでいた系列を控えておく
  const [sheetSeries, setSheetSeries] = useState(selectedSeries);
  if (selectedSeries && selectedSeries !== sheetSeries) setSheetSeries(selectedSeries);

  // 目盛りを出す週(間隔が狭いときは最新の週から数えて間引く)
  const labelEvery =
    xs.length >= 2 ? Math.max(1, Math.ceil(MIN_LABEL_GAP / (xs[1] - xs[0]))) : 1;

  // 選んだ系列の詳細は週が多いと横に収まらないため横スクロールにし、最新の週を見せておく
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = detailRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [active, trend]);

  return (
    <Card className="shadow-md">
      <CardBody className="gap-3 p-3">
        <div className="flex items-start gap-2">
          <LuChartSpline className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <h2 className="text-sm font-black text-default-700 leading-tight">
              使用率順位の推移（TOP{limit}）
            </h2>
            <span className="text-[0.625rem] text-default-400 leading-snug">
              1体目のポケモンでまとめた集計
            </span>
          </div>
        </div>

        {/* 対象期間。データに依らない操作なので読み込み中も出したままにする */}
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-1.5">
            <WeekSelect
              label="開始週"
              name="deck-usage-trend-from"
              value={range.from}
              // 開始週に最新の週は選べない(最低2週)
              options={weekOptions.filter((o) => o.value < latestWeek)}
              onChange={(v) => changeRange("from", v)}
            />
            <span className="pb-2 text-xs text-default-400">〜</span>
            <WeekSelect
              label="終了週"
              name="deck-usage-trend-to"
              value={range.to}
              // 終了週に最も古い週は選べない(最低2週)
              options={weekOptions.filter((o) => o.value > earliestWeek)}
              onChange={(v) => changeRange("to", v)}
            />
          </div>
          <span className="text-center text-[0.625rem] text-default-400 leading-snug">
            {trendWeekCount(range)}週（{DECK_USAGE_TREND_MIN_WEEKS}〜
            {DECK_USAGE_TREND_MAX_WEEKS}
            週で指定できます）
            {range.to === latestWeek && "・今週は集計途中です"}
          </span>
        </div>

        {/* 選んだ系列の週ごとの順位・使用率。高さを固定して、選択の有無で下がずれないようにする。
            高さは中身(日付12px + 順位20px + 使用率14px + 上下の余白 = 54px)より十分に大きく取る */}
        <div className="flex h-[4.5rem] items-center gap-2 rounded-xl bg-default-50 px-2">
          {activeSeries && trend ? (
            <>
              <PokemonSprite id={activeSeries.pokemon_sprites[0]?.id} size={36} />
              <div
                ref={detailRef}
                // 横にだけ送れるようにする。overflow-x を auto にすると縦も auto 扱いになり、
                // 文字の描画が行の高さから数px はみ出しただけで縦にスクロールできてしまうため、
                // 縦は明示的に止める。スクロールバーは数値に重なるので隠す(指・ホイールでは横に送れる)
                className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div
                  className="grid gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${weekCount}, minmax(2.25rem, 1fr))`,
                  }}
                >
                  {activeSeries.points.map((p, i) => (
                    <div
                      key={trend.weeks[i].week}
                      className="flex flex-col items-center py-1"
                    >
                      <span className="text-[0.5625rem] leading-3 text-default-400 tabular-nums">
                        {shortDate(trend.weeks[i].week)}
                      </span>
                      {/* 圏外でも順位が分かる週(個別の行には出ている)は順位を控えめに出す。
                          「その他」に回った週・1件も無い週は順位が無いので「圏外」 */}
                      <span
                        className={`text-sm leading-5 font-black tabular-nums ${
                          p.rank != null && p.rank <= limit
                            ? "text-default-700"
                            : "text-default-400"
                        }`}
                      >
                        {p.rank != null ? `${p.rank}位` : "圏外"}
                      </span>
                      <span className="text-[0.625rem] leading-3.5 tabular-nums text-default-400">
                        {formatRate(p.usage_rate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* タップで選んでいるときだけ、組み合わせの内訳を開ける
                  (マウスを載せているだけの強調では出さない。載せ替えるたびに出入りしてしまう) */}
              {selectedSeries && selectedSeries.fingerprint === activeSeries.fingerprint && (
                <button
                  type="button"
                  onClick={() => setMembersOpen(true)}
                  className="flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-primary/10 text-[0.5625rem] font-bold text-primary active:bg-primary/20"
                >
                  <LuLayers className="h-4 w-4" />
                  内訳
                </button>
              )}
            </>
          ) : (
            <span className="w-full text-center text-[0.625rem] text-default-400">
              線やポケモンをタップすると、週ごとの順位と使用率を表示します
            </span>
          )}
        </div>

        {isError ? (
          <div
            className="flex items-center justify-center"
            style={{ height: chartHeight }}
          >
            <FetchError
              message="使用率の推移を取得できませんでした"
              onRetry={() => setReloadKey((key) => key + 1)}
              isRetrying={isLoading}
              compact
            />
          </div>
        ) : isLoading && !trend ? (
          <div
            className="animate-pulse rounded-xl bg-default-100"
            style={{ height: chartHeight + 24 }}
          />
        ) : !hasChart ? (
          <div className="h-48 flex items-center justify-center">
            <span className="text-xs text-default-400 text-center px-4">
              推移を表示できるデータがまだありません。
            </span>
          </div>
        ) : (
          <div
            className={`transition-opacity duration-300 ${isLoading ? "opacity-30" : "opacity-100"}`}
          >
            <div ref={rowRef} className="flex">
              <EdgeColumn
                byRank={leftEdge}
                limit={limit}
                height={chartHeight}
                side="left"
                active={active}
                onToggle={toggle}
                onHover={hover}
              />
              <div
                className="relative min-w-0 flex-1 overflow-hidden"
                style={{ height: chartHeight }}
              >
                {xs.length > 0 && (
                  <svg
                    width={plotWidth}
                    height={chartHeight}
                    className={`block overflow-hidden ${
                      active != null ? "[&_.trend-series]:opacity-[0.12]" : ""
                    }`}
                    role="img"
                    aria-label={`使用率順位の推移（上位${limit}位）`}
                    // 線以外の場所をタップしたら選択を外す
                    onClick={() => setSelected(null)}
                  >
                    {/* 週の目盛り線 */}
                    {xs.map((x, i) => (
                      <line
                        key={i}
                        x1={x}
                        x2={x}
                        y1={0}
                        y2={chartHeight}
                        className="stroke-default-200"
                        strokeWidth={1}
                      />
                    ))}
                    {lines.map((line) => (
                      <SeriesLine
                        key={line.fingerprint}
                        fingerprint={line.fingerprint}
                        d={line.d}
                        dots={line.dots}
                        color={line.color}
                        onToggle={toggle}
                        onHover={hover}
                      />
                    ))}
                    {activeLine && (
                      <ActiveSeriesLine
                        line={activeLine}
                        interactive={selected === activeLine.fingerprint}
                        onToggle={toggle}
                      />
                    )}
                  </svg>
                )}
              </div>
              <EdgeColumn
                byRank={rightEdge}
                limit={limit}
                height={chartHeight}
                side="right"
                active={active}
                onToggle={toggle}
                onHover={hover}
              />
            </div>

            {/* 週の目盛り(各週の月曜日) */}
            <div className="relative h-5" style={{ marginLeft: SIDE, marginRight: SIDE }}>
              {trend.weeks.map((w, i) =>
                xs[i] != null && (weekCount - 1 - i) % labelEvery === 0 ? (
                  <span
                    key={w.week}
                    className="absolute top-1 -translate-x-1/2 text-[0.625rem] tabular-nums text-default-400"
                    style={{ left: xs[i] }}
                  >
                    {shortDate(w.week)}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        )}

        <span className="text-[0.625rem] text-default-300 leading-snug text-center">
          ※週ごとの使用率ランキングの順位を線でつないでいます
          <br />※{limit}位より下の週は、線が下端の外へ抜けて表示されます
          <br />
          ※目盛りの日付は各週の月曜日です
        </span>
        <WeeklyDeckUsageTrendMembersSheet
          isOpen={membersOpen}
          onOpenChange={() => setMembersOpen((open) => !open)}
          onClose={() => setMembersOpen(false)}
          range={range}
          series={sheetSeries}
          weeks={trend?.weeks ?? []}
          limit={limit}
        />
      </CardBody>
    </Card>
  );
}
