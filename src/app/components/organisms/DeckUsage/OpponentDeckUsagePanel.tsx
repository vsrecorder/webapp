"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { ArcElement, Chart as ChartJS, Tooltip as ChartTooltip, type ActiveElement } from "chart.js";
import { Pie } from "react-chartjs-2";
import { Card, CardBody, Chip, Image, Tab, Tabs } from "@heroui/react";

import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { spriteScaleClass } from "@app/utils/sprite";
import {
  OpponentDeckUsageItemType,
  OpponentDeckUsageStatType,
} from "@app/types/opponent_deck_usage_stat";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import { seasonOptionsFromChampionshipSeries, currentSeasonValue } from "@app/utils/season";
import { lighten } from "@app/utils/color";
import { groupIntoOther } from "@app/utils/deckUsageOther";
import {
  createPieSlicesSpritePlugin,
  createPieCenterSpritePlugin,
} from "@app/utils/pieSlicesSpritePlugin";

ChartJS.register(ArcElement, ChartTooltip);

type FilterMode = "month" | "environment" | "season" | "regulation";

type Props = {
  userId: string;
  environments: EnvironmentType[];
  currentEnvironmentId?: string;
  standardRegulations: StandardRegulationType[];
  championshipSeries: ChampionshipSeriesType[];
  userCreatedAt?: string;
};

const SLICE_COLORS = [
  "#006FEE",
  "#17C964",
  "#F5A524",
  "#F31260",
  "#7828C8",
  "#06B6D4",
  "#9353D3",
  "#FF7B00",
  "#0EA5E9",
  "#D946EF",
];
const OTHER_COLOR = "#A1A1AA";
// 対面率がこの値未満のデッキは「その他」にまとめる
const OTHER_THRESHOLD = 0.05;

// 円グラフ本体はスプライト画像を主役にしたいため、塗りは薄いパステル調にする
const SLICE_COLORS_SOFT = SLICE_COLORS.map((c) => lighten(c, 0.55));
const OTHER_COLOR_SOFT = lighten(OTHER_COLOR, 0.55);

// 円グラフ本体の高さ。外側スプライト分の余白はこれとは別にコンテナ側で確保し、
// 円自体の大きさはこの値のまま変えない。
const CHART_SIZE = 192;
// 円の外側にスプライトを表示するための余白（chart.jsのlayout.paddingと合わせる）
const EXTERNAL_SPRITE_PADDING = 72;
// 詳細カード表示中はグラフの横幅が狭くなり、幅が余白の制約になってしまうため、
// このときだけ余白を小さくして円のサイズを優先する
const EXTERNAL_SPRITE_PADDING_NARROW = 30;

const SPRITE_BASE_URL = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

function spriteUrl(id: string): string {
  return `${SPRITE_BASE_URL}/${id.replace(/^0+(?!$)/, "")}.png`;
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function generateYearMonthOptions(createdAt?: Date) {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const start = createdAt
    ? new Date(createdAt.getFullYear(), createdAt.getMonth(), 1)
    : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  let d = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d >= start) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  return options;
}

// 勝率に応じた色分け（UserStatPanel/UserProfileCardの勝率表示と同じ閾値に合わせる）
function winRateChipColor(rate: number): "success" | "default" | "warning" | "danger" {
  if (rate >= 0.55) return "success";
  if (rate >= 0.45) return "default";
  if (rate >= 0.4) return "warning";
  return "danger";
}

function winRateTextColor(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
}

type TooltipState = {
  deck: OpponentDeckUsageItemType;
  color: string;
};

function DeckSprites({ deck }: { deck: OpponentDeckUsageItemType }) {
  const sprites = deck.pokemon_sprites ?? [];

  if (sprites.length === 0) {
    return (
      <div className="flex items-center gap-0 shrink-0">
        <Image
          alt="unknown"
          src={`${SPRITE_BASE_URL}/unknown.png`}
          className="w-8 h-8 object-contain scale-150 origin-bottom"
        />
        <Image
          alt="unknown"
          src={`${SPRITE_BASE_URL}/unknown.png`}
          className="w-8 h-8 object-contain scale-150 origin-bottom"
        />
      </div>
    );
  } else if (sprites.length === 1) {
    return (
      <div className="flex items-center gap-0 shrink-0">
        {sprites.slice(0, 1).map((sprite, idx) => (
          <Image
            key={`${sprite.id}-${idx}`}
            alt={sprite.id}
            src={spriteUrl(sprite.id)}
            className={`w-8 h-8 object-contain ${spriteScaleClass(sprite.id)} origin-bottom`}
          />
        ))}
        <Image
          alt="unknown"
          src={`${SPRITE_BASE_URL}/unknown.png`}
          className="w-8 h-8 object-contain scale-150 origin-bottom"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 shrink-0">
      {sprites.slice(0, 2).map((sprite, idx) => (
        <Image
          key={`${sprite.id}-${idx}`}
          alt={sprite.id}
          src={spriteUrl(sprite.id)}
          className={`w-8 h-8 object-contain ${spriteScaleClass(sprite.id)} origin-bottom`}
        />
      ))}
    </div>
  );
}

export default function OpponentDeckUsagePanel({
  userId,
  environments,
  currentEnvironmentId,
  standardRegulations,
  championshipSeries,
  userCreatedAt,
}: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("environment");
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonth);
  const [environmentId, setEnvironmentId] = useState<string>(
    currentEnvironmentId ?? environments[0]?.id ?? "",
  );
  const [season, setSeason] = useState<string>(() => currentSeasonValue(championshipSeries));
  const [regulationId, setRegulationId] = useState<string>(
    standardRegulations[0]?.id ?? "",
  );
  const [stat, setStat] = useState<OpponentDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [ownDeckId, setOwnDeckId] = useState<string>("");
  const [ownDecks, setOwnDecks] = useState<DeckUsageItemType[]>([]);

  const chartRef = useRef<ChartJS<"pie">>(null);

  const createdAtDate = userCreatedAt != null ? new Date(userCreatedAt) : undefined;
  const yearMonthOptions = generateYearMonthOptions(createdAtDate);
  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

  useEffect(() => {
    let cancelled = false;

    async function fetchStat() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterMode === "month" && yearMonth) {
          params.set("year_month", yearMonth);
        } else if (filterMode === "environment" && environmentId) {
          params.set("environment_id", environmentId);
        } else if (filterMode === "season" && season) {
          params.set("season", season);
        } else if (filterMode === "regulation" && regulationId) {
          params.set("regulation_id", regulationId);
        }
        if (ownDeckId) params.set("deck_id", ownDeckId);

        const res = await fetch(
          `/api/users/${userId}/opponent-deck-usage?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        if (!res.ok) return;

        const data: OpponentDeckUsageStatType = await res.json();
        if (!cancelled) setStat(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchStat();
    return () => {
      cancelled = true;
    };
  }, [userId, filterMode, yearMonth, environmentId, season, regulationId, ownDeckId]);

  // 期間フィルタが変わるたびに、その期間で実際に使用したデッキ一覧を取得し
  // 「自分のデッキ」セレクタの選択肢にする（未使用デッキを候補に出さないため）
  useEffect(() => {
    let cancelled = false;

    async function fetchOwnDecks() {
      try {
        const params = new URLSearchParams();
        if (filterMode === "month" && yearMonth) {
          params.set("year_month", yearMonth);
        } else if (filterMode === "environment" && environmentId) {
          params.set("environment_id", environmentId);
        } else if (filterMode === "season" && season) {
          params.set("season", season);
        } else if (filterMode === "regulation" && regulationId) {
          params.set("regulation_id", regulationId);
        }

        const res = await fetch(`/api/users/${userId}/deck-usage?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: DeckUsageStatType = await res.json();
        // deck_id は ULID のため文字列降順に並べると新しいデッキが先頭にくる
        const sortedDecks = [...(data.decks ?? [])].sort((a, b) =>
          a.deck_id < b.deck_id ? 1 : a.deck_id > b.deck_id ? -1 : 0,
        );
        if (!cancelled) setOwnDecks(sortedDecks);
      } catch (e) {
        console.error(e);
      }
    }

    setOwnDeckId("");
    fetchOwnDecks();
    return () => {
      cancelled = true;
    };
  }, [userId, filterMode, yearMonth, environmentId, season, regulationId]);

  const decks = useMemo(() => stat?.decks ?? [], [stat]);

  // 対面率が低い（出現頻度が低い）デッキをまとめて「その他」として1件に集約する。
  const { displayItems: displayDecks, hasOther } = useMemo(
    () =>
      groupIntoOther(decks, {
        threshold: OTHER_THRESHOLD,
        maxIndividual: SLICE_COLORS.length - 1,
        createOther: (aggregate): OpponentDeckUsageItemType => ({
          deck_info: "その他",
          pokemon_sprites: [],
          ...aggregate,
        }),
      }),
    [decks],
  );

  const deckColors = useMemo(
    () =>
      displayDecks.map((_, idx) =>
        hasOther && idx === displayDecks.length - 1 ? OTHER_COLOR : SLICE_COLORS[idx],
      ),
    [displayDecks, hasOther],
  );
  // 円グラフ本体に使う薄色（凡例・ツールチップの文字色は従来通り濃色を使う）
  const deckColorsSoft = useMemo(
    () =>
      displayDecks.map((_, idx) =>
        hasOther && idx === displayDecks.length - 1 ? OTHER_COLOR_SOFT : SLICE_COLORS_SOFT[idx],
      ),
    [displayDecks, hasOther],
  );

  // react-chartjs-2はマウント後にplugins prop自体の変更を反映しないため、
  // プラグインの中身は常に最新のstateを見るようrefを介して参照する
  // (useMemoで作り直しても、react-chartjs-2側が古いプラグインインスタンスを使い続けてしまう)
  const displayDecksRef = useRef(displayDecks);
  displayDecksRef.current = displayDecks;
  const tooltipRef = useRef(tooltip);
  tooltipRef.current = tooltip;

  // スライス上に重ねるスプライト画像（実際に登録されている分のみ。最大2体）
  // 「その他」など情報を持たないデッキは何も描画しない
  // 詳細カード表示中は選択デッキを円の中心に表示するため、スライス上の個別表示は消す
  const spritePlugin = useMemo(
    () =>
      createPieSlicesSpritePlugin((idx) =>
        tooltipRef.current
          ? []
          : (displayDecksRef.current[idx]?.pokemon_sprites ?? [])
              .slice(0, 2)
              .map((s) => spriteUrl(s.id)),
      ),
    [],
  );

  // 詳細カード表示中、選択中のデッキのスプライトを円の中心に表示する
  const centerSpritePlugin = useMemo(
    () =>
      createPieCenterSpritePlugin(() =>
        tooltipRef.current
          ? (tooltipRef.current.deck.pokemon_sprites ?? []).slice(0, 2).map((s) => spriteUrl(s.id))
          : null,
      ),
    [],
  );

  useEffect(() => {
    setSelectedIdx(null);
    setTooltip(null);
    tooltipRef.current = null;
  }, [stat]);

  // 詳細表示を閉じて円グラフのみの表示に戻す
  function closeDetail() {
    setSelectedIdx(null);
    setTooltip(null);
    tooltipRef.current = null;
  }

  function handleLegendClick(idx: number) {
    if (selectedIdx === idx) {
      closeDetail();
      return;
    }

    const nextTooltip = { deck: displayDecks[idx], color: deckColors[idx] };
    setSelectedIdx(idx);
    setTooltip(nextTooltip);
    tooltipRef.current = nextTooltip;
  }

  // 円グラフのコンテナ（スライス部分＋外側の余白）のクリックを自前でヒットテストする。
  // chart.jsのoptions.onClickは「chartArea」の外側（＝スプライトを描く余白部分）をタップした場合
  // 一切呼ばれない仕様のため、その領域のタップも拾うためにコンテナ側でハンドリングする。
  function handleChartAreaClick(e: ReactMouseEvent<HTMLDivElement>) {
    const chart = chartRef.current;
    if (!chart) return;
    const elements = chart.getElementsAtEventForMode(
      e.nativeEvent,
      "nearest",
      { intersect: true },
      false,
    ) as ActiveElement[];
    if (elements.length === 0) {
      closeDetail();
      return;
    }
    handleLegendClick(elements[0].index);
  }

  const filterLabel =
    filterMode === "month"
      ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
      : filterMode === "environment"
        ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』環境`
        : filterMode === "season"
          ? (seasonOptions.find((o) => o.value === season)?.label ?? season)
          : `『${standardRegulations.find((r) => r.id === regulationId)?.marks ?? ""}』`;

  const chartData = {
    labels: displayDecks.map((d) => d.deck_info),
    datasets: [
      {
        data: displayDecks.map((d) => d.count),
        // 通常時は薄色にして無機質さを抑え、選択中のスライスだけ元の鮮やかな色にして目立たせる。
        // chart.jsのhover/active機構(setActiveElements・hoverBackgroundColor)は、
        // 選択時にグラフの横幅が変わって発生するresize処理の途中でリセットされてしまうため使わず、
        // 通常のデータ(backgroundColor・offset)として選択状態を表現する
        backgroundColor: displayDecks.map((_, i) => (i === selectedIdx ? deckColors[i] : deckColorsSoft[i])),
        borderColor: "#ffffff",
        borderWidth: 2,
        // 選択中のスライスを少し外側に押し出してさらに目立たせる
        offset: displayDecks.map((_, i) => (i === selectedIdx ? 10 : 0)),
      },
    ],
  };

  // 詳細カード表示中はグラフの横幅が狭くなり、大きな余白だと横幅の制約で円自体が縮んでしまうため、
  // その場合だけ余白を小さくして円のサイズを優先する
  const spritePadding = tooltip ? EXTERNAL_SPRITE_PADDING_NARROW : EXTERNAL_SPRITE_PADDING;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    // 狭いスライスのスプライトを円の外側に描画するための余白（円自体は縮小しない。下記コンテナの高さ側で吸収する）
    layout: { padding: spritePadding },
    // クリック判定は下のコンテナdiv側(handleChartAreaClick)で行うため、ここでは何もしない
    // (chart.jsのoptions.onClickはchartArea外側=余白部分のタップを検知できないため)
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <Card>
      <CardBody className="gap-4 p-4">
        {/* フィルタータブ */}
        <Tabs
          fullWidth
          size="sm"
          selectedKey={filterMode}
          onSelectionChange={(key) => setFilterMode(key as FilterMode)}
          classNames={{
            tab: "h-7",
            tabContent: "font-bold text-xs",
          }}
        >
          <Tab key="month" title="月別" />
          <Tab key="environment" title="環境別" />
          <Tab key="season" title="シーズン別" />
          <Tab key="regulation" title="レギュレーション別" />
        </Tabs>

        {/* セレクタ */}
        <div className="relative">
          <select
            value={
              filterMode === "month"
                ? yearMonth
                : filterMode === "environment"
                  ? environmentId
                  : filterMode === "season"
                    ? season
                    : regulationId
            }
            onChange={(e) => {
              if (filterMode === "month") {
                setYearMonth(e.target.value);
              } else if (filterMode === "environment") {
                setEnvironmentId(e.target.value);
              } else if (filterMode === "season") {
                setSeason(e.target.value);
              } else {
                setRegulationId(e.target.value);
              }
            }}
            className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {filterMode === "month"
              ? yearMonthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : filterMode === "environment"
                ? environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      『{env.title}』
                    </option>
                  ))
                : filterMode === "season"
                  ? seasonOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))
                  : standardRegulations.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        『{reg.marks}』
                      </option>
                    ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
            ▼
          </span>
        </div>

        {/* 自分のデッキセレクタ（対面相性の勝率は使用デッキによって変わるため） */}
        <div className="relative">
          <select
            value={ownDeckId}
            onChange={(e) => setOwnDeckId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">使用したすべてのデッキで集計</option>
            {ownDecks.map((deck) => (
              <option key={deck.deck_id} value={deck.deck_id}>
                {deck.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
            ▼
          </span>
        </div>

        {/* 期間ラベル */}
        <p className="text-center text-xs text-default-400 -mt-2">
          {filterLabel}
          {ownDeckId
            ? `『${ownDecks.find((d) => d.deck_id === ownDeckId)?.name ?? ""}』使用時の`
            : ""}
          対戦相手のデッキ分布・勝率
        </p>

        {/* グラフ + 凡例 */}
        {isLoading && !stat ? (
          <div
            className="flex items-center justify-center"
            style={{ height: CHART_SIZE + EXTERNAL_SPRITE_PADDING * 2 }}
          >
            <span className="text-xs text-default-400">読み込み中...</span>
          </div>
        ) : decks.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: CHART_SIZE + EXTERNAL_SPRITE_PADDING * 2 }}
          >
            <span className="text-xs text-default-400">データがありません</span>
          </div>
        ) : (
          <>
            {/* グラフ領域＋詳細カード。選択時はグラフを左に寄せ、右側に詳細カードを表示する（グラフには重ねない） */}
            <div className="flex items-stretch gap-3">
              <div
                onClick={handleChartAreaClick}
                className={`relative shrink-0 transition-all duration-300 ${isLoading ? "opacity-30" : "opacity-100"} ${tooltip ? "w-[56%]" : "w-full"}`}
                style={{ height: CHART_SIZE + spritePadding * 2 }}
              >
                <Pie
                  ref={chartRef}
                  data={chartData}
                  options={chartOptions}
                  plugins={[spritePlugin, centerSpritePlugin]}
                />
              </div>

              {/* タップしたデッキの詳細（再タップで閉じて円グラフのみの表示に戻す） */}
              {tooltip && (
                <div
                  onClick={closeDetail}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-default-200 bg-content1 px-2 py-3 shadow-sm cursor-pointer"
                  style={{ borderLeftColor: tooltip.color, borderLeftWidth: 4 }}
                >
                  <DeckSprites deck={tooltip.deck} />
                  <p className="text-xs font-bold text-default-700 text-center truncate w-full">
                    {tooltip.deck.deck_info}
                  </p>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-bold text-default-400">対面率</span>
                    <span
                      className="text-lg font-black tabular-nums leading-none"
                      style={{ color: tooltip.color }}
                    >
                      {(tooltip.deck.usage_rate * 100).toFixed(1)}
                      <span className="text-xs font-bold">%</span>
                    </span>
                    <span className="text-[10px] text-default-400">
                      ({tooltip.deck.count}件)
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 pt-1.5 border-t border-default-200 w-full">
                    <span className="text-[10px] font-bold text-default-400">対面勝率</span>
                    <span
                      className={`text-base font-black tabular-nums ${winRateTextColor(tooltip.deck.win_rate)}`}
                    >
                      {(tooltip.deck.win_rate * 100).toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-default-400">
                      {tooltip.deck.wins}勝{tooltip.deck.losses}敗
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 凡例リスト（スプライト画像 + デッキ名 + 対面率） */}
            <div className="flex flex-col gap-1.5">
              {displayDecks.map((deck, idx) => (
                <div
                  key={`${deck.deck_info}-${idx}`}
                  onClick={() => handleLegendClick(idx)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 cursor-pointer transition-colors duration-150 ${
                    selectedIdx === idx
                      ? "bg-default-200 ring-1 ring-default-400"
                      : "bg-default-100 hover:bg-default-200"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: deckColors[idx] }}
                  />
                  <div className="w-16 flex justify-center shrink-0">
                    <DeckSprites deck={deck} />
                  </div>
                  <span className="font-bold text-xs text-default-700 truncate flex-1 min-w-0">
                    {deck.deck_info}
                  </span>
                  <div className="flex flex-col items-end gap-1 shrink-0 pl-2 border-l border-default-200">
                    <span className="text-[10px] text-default-400 tabular-nums">
                      対面率 {(deck.usage_rate * 100).toFixed(1)}% ({deck.count}件)
                    </span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={winRateChipColor(deck.win_rate)}
                      classNames={{
                        base: "h-5 px-0.5",
                        content: "text-[11px] font-black tabular-nums px-1.5",
                      }}
                    >
                      勝率 {(deck.win_rate * 100).toFixed(1)}%
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
