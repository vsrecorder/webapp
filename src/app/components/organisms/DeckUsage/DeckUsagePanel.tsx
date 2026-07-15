"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  ArcElement,
  Chart as ChartJS,
  Tooltip as ChartTooltip,
  type ActiveElement,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardBody, Chip, Tab, Tabs } from "@heroui/react";

import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import {
  seasonOptionsFromChampionshipSeries,
  currentSeasonValue,
} from "@app/utils/season";
import { lighten } from "@app/utils/color";
import { roundToSignificantDigits } from "@app/utils/number";
import { groupIntoOther } from "@app/utils/deckUsageOther";
import {
  createPieSlicesSpritePlugin,
  createPieCenterSpritePlugin,
  getSpriteBadgeIndexAt,
} from "@app/utils/pieSlicesSpritePlugin";
import DeckUsageEmptyState from "@app/components/organisms/DeckUsage/DeckUsageEmptyState";

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

// 円グラフの各スライスに割り当てる配色
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
// 個別に表示するデッキの最大数（これを超える分は「その他」1件にまとめ、
// 合計の最大表示件数は7件になる）
const MAX_INDIVIDUAL_DECKS = 6;

// 円グラフ本体はスプライト画像を主役にしたいため、塗りは薄いパステル調にする
const SLICE_COLORS_SOFT = SLICE_COLORS.map((c) => lighten(c, 0.55));
const OTHER_COLOR_SOFT = lighten(OTHER_COLOR, 0.55);

// 円グラフ本体の高さ。外側スプライト分の余白はこれとは別にコンテナ側で確保し、
// 円自体の大きさはこの値のまま変えない。
const CHART_SIZE = 192;
// 詳細カード表示中は外周バッジを描画せず円の中心に情報をまとめるため、外側の余白を
// 小さくできる分、円自体を一回り大きくして見やすくする
const CHART_SIZE_DETAIL = 216;
// 円の外側にスプライトバッジを表示するための左右の余白（コンテナのmin-widthと合わせる。
// スプライト2体分のバッジが横向きになった場合でも見切れない最低限の値を確保する）
const EXTERNAL_SPRITE_PADDING_X = 64;
// 詳細カード表示中は外周バッジ自体を描画しないため、見た目の余白程度の小さい値でよい
const EXTERNAL_SPRITE_PADDING_X_NARROW = 28;
// 円の外側にスプライトバッジを表示するための上下の余白（コンテナの高さと合わせる）。
// バッジは上下方向にも同じ分だけ張り出すため、左右よりさらに余裕を持たせて見切れを防ぐ
const EXTERNAL_SPRITE_PADDING_Y = 88;
// 詳細カード表示中は外周バッジ自体を描画しないため、見た目の余白程度の小さい値でよい
const EXTERNAL_SPRITE_PADDING_Y_NARROW = 28;

const SPRITE_BASE_URL = "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites";

function spriteUrl(id: string): string {
  return `${SPRITE_BASE_URL}/${id.replace(/^0+(?!$)/, "")}.png`;
}

// 円グラフのバッジ/中心に渡すスプライトURL。DOM の DeckSprites と表示を揃えるため、
// 実スプライトが1体でも常に2枠分返し、足りない枠は unknown で補完する。
// ただしスプライトが0体(「その他」等)のときは空配列を返してバッジを描画させない。
function deckSpriteUrls(sprites: { id: string }[] | undefined): string[] {
  const real = (sprites ?? []).slice(0, 2);
  if (real.length === 0) return [];
  const urls = real.map((s) => spriteUrl(s.id));
  while (urls.length < 2) urls.push(`${SPRITE_BASE_URL}/unknown.png`);
  return urls;
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// 勝率に応じた色分け（OpponentDeckUsagePanelの勝率表示と同じ閾値に合わせる）
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

type TooltipState = {
  deck: DeckUsageItemType;
  color: string;
};

function DeckSprites({ deck }: { deck: DeckUsageItemType }) {
  const sprites = deck.pokemon_sprites ?? [];

  // 先頭2体を枠内で最適表示(PokemonSprite)。無い枠は unknown。
  return (
    <div className="flex items-center gap-0 shrink-0">
      <PokemonSprite id={sprites[0]?.id} size={32} />
      <PokemonSprite id={sprites[1]?.id} size={32} />
    </div>
  );
}

export default function DeckUsagePanel({
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
  const [season, setSeason] = useState<string>(() =>
    currentSeasonValue(championshipSeries),
  );
  const [regulationId, setRegulationId] = useState<string>(
    standardRegulations[0]?.id ?? "",
  );
  const [stat, setStat] = useState<DeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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

        const res = await fetch(`/api/users/${userId}/deck-usage?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: DeckUsageStatType = await res.json();
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
  }, [userId, filterMode, yearMonth, environmentId, season, regulationId]);

  const decks = useMemo(() => stat?.decks ?? [], [stat]);

  // 表示件数が多いとノイズになるため、対面率が低いデッキは「その他」にまとめる
  const { displayItems: displayDecks, hasOther } = useMemo(
    () =>
      groupIntoOther(decks, {
        threshold: OTHER_THRESHOLD,
        maxIndividual: MAX_INDIVIDUAL_DECKS,
        createOther: (aggregate, rest): DeckUsageItemType => {
          const gameCount = rest.reduce((sum, item) => sum + item.game_count, 0);
          const goFirstCount = rest.reduce((sum, item) => sum + item.go_first_count, 0);
          const goSecondCount = gameCount - goFirstCount;
          const goFirstWins = rest.reduce((sum, item) => sum + item.go_first_wins, 0);
          const goSecondWins = rest.reduce((sum, item) => sum + item.go_second_wins, 0);

          return {
            deck_id: "",
            name: "その他",
            pokemon_sprites: [],
            game_count: gameCount,
            go_first_count: goFirstCount,
            go_second_count: goSecondCount,
            go_first_rate: gameCount > 0 ? goFirstCount / gameCount : 0,
            go_first_wins: goFirstWins,
            go_first_win_rate: goFirstCount > 0 ? goFirstWins / goFirstCount : 0,
            go_second_wins: goSecondWins,
            go_second_win_rate: goSecondCount > 0 ? goSecondWins / goSecondCount : 0,
            ...aggregate,
          };
        },
      }),
    [decks],
  );

  // スライスごとの色（凡例とグラフで一致させる）
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
        hasOther && idx === displayDecks.length - 1
          ? OTHER_COLOR_SOFT
          : SLICE_COLORS_SOFT[idx],
      ),
    [displayDecks, hasOther],
  );

  // react-chartjs-2はマウント後にplugins prop自体の変更を反映しないため、
  // プラグインの中身は常に最新のstateを見るようrefを介して参照する
  // (useMemoで作り直しても、react-chartjs-2側が古いプラグインインスタンスを使い続けてしまう)
  const displayDecksRef = useRef(displayDecks);
  displayDecksRef.current = displayDecks;
  const deckColorsRef = useRef(deckColors);
  deckColorsRef.current = deckColors;
  const tooltipRef = useRef(tooltip);
  tooltipRef.current = tooltip;

  // 外周に色バッジ付きで表示するスプライト画像（実際に登録されている分のみ。最大2体）
  // 「その他」など情報を持たないデッキは何も描画しない
  // 詳細カード表示中は選択デッキの情報を円の中心にまとめて表示するため、外周のバッジは消す
  const spritePlugin = useMemo(
    () =>
      createPieSlicesSpritePlugin(
        (idx) =>
          tooltipRef.current
            ? []
            : deckSpriteUrls(displayDecksRef.current[idx]?.pokemon_sprites),
        (idx) => deckColorsRef.current[idx] ?? OTHER_COLOR,
        (idx) => {
          const rate = displayDecksRef.current[idx]?.usage_rate;
          return rate != null ? `${roundToSignificantDigits(rate * 100, 3)}%` : null;
        },
      ),
    [],
  );

  // 詳細カード表示中、選択中のデッキのスプライトと使用率を円の中心に表示する
  const centerSpritePlugin = useMemo(
    () =>
      createPieCenterSpritePlugin(
        () =>
          tooltipRef.current
            ? deckSpriteUrls(tooltipRef.current.deck.pokemon_sprites)
            : null,
        () =>
          tooltipRef.current
            ? `${roundToSignificantDigits(tooltipRef.current.deck.usage_rate * 100, 3)}%`
            : null,
      ),
    [],
  );

  // データが切り替わったら選択状態をリセット
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
      // 同じ項目を再タップ → 詳細表示を消す
      closeDetail();
      return;
    }

    const nextTooltip = { deck: displayDecks[idx], color: deckColors[idx] };
    setSelectedIdx(idx);
    setTooltip(nextTooltip);
    tooltipRef.current = nextTooltip;
  }

  // 円グラフのコンテナ（スライス部分＋外側の余白）のクリックを自前でヒットテストする。
  // chart.jsのoptions.onClickは「chartArea」の外側（＝スプライトバッジを描く余白部分）を
  // タップした場合一切呼ばれない仕様のため、その領域のタップも拾うためにコンテナ側でハンドリングする。
  function handleChartAreaClick(e: ReactMouseEvent<HTMLDivElement>) {
    const chart = chartRef.current;
    if (!chart) return;
    const elements = chart.getElementsAtEventForMode(
      e.nativeEvent,
      "nearest",
      { intersect: true },
      false,
    ) as ActiveElement[];
    if (elements.length > 0) {
      handleLegendClick(elements[0].index);
      return;
    }

    // スライス本体に当たらなかった場合、外周のスプライトバッジをタップしていないか確認する
    const badgeIndex = getSpriteBadgeIndexAt(chart, e.nativeEvent);
    if (badgeIndex !== null) {
      handleLegendClick(badgeIndex);
      return;
    }

    closeDetail();
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
    labels: displayDecks.map((d) => d.name),
    datasets: [
      {
        data: displayDecks.map((d) => d.count),
        // 通常時は薄色にして無機質さを抑え、選択中のスライスだけ元の鮮やかな色にして目立たせる。
        // chart.jsのhover/active機構(setActiveElements・hoverBackgroundColor)は、
        // 選択時にグラフの横幅が変わって発生するresize処理の途中でリセットされてしまうため使わず、
        // 通常のデータ(backgroundColor・offset)として選択状態を表現する
        backgroundColor: displayDecks.map((_, i) =>
          i === selectedIdx ? deckColors[i] : deckColorsSoft[i],
        ),
        borderColor: "#ffffff",
        borderWidth: 2,
        // 選択中のスライスを少し外側に押し出してさらに目立たせる
        offset: displayDecks.map((_, i) => (i === selectedIdx ? 10 : 0)),
      },
    ],
  };

  // 詳細カード表示中は外周バッジを描画しないため余白は最低限でよく、その分円を大きく表示できる
  const spritePaddingX = tooltip
    ? EXTERNAL_SPRITE_PADDING_X_NARROW
    : EXTERNAL_SPRITE_PADDING_X;
  const spritePaddingY = tooltip
    ? EXTERNAL_SPRITE_PADDING_Y_NARROW
    : EXTERNAL_SPRITE_PADDING_Y;
  const chartSize = tooltip ? CHART_SIZE_DETAIL : CHART_SIZE;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    // 狭いスライスのスプライトを円の外側に描画するための余白（円自体は縮小しない。下記コンテナの高さ側で吸収する）
    layout: {
      padding: {
        top: spritePaddingY,
        bottom: spritePaddingY,
        left: spritePaddingX,
        right: spritePaddingX,
      },
    },
    // クリック判定は下のコンテナdiv側(handleChartAreaClick)で行うため、ここでは何もしない
    // (chart.jsのoptions.onClickはchartArea外側=余白部分のタップを検知できないため)
    plugins: {
      legend: { display: false },
      // ビルトイン tooltip を無効化してカスタム HTML tooltip を使う
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
          <Tab key="month" title="月次" />
          <Tab key="environment" title="環境" />
          <Tab key="season" title="シーズン" />
          <Tab key="regulation" title="レギュレーション" />
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

        {/* 期間ラベル */}
        <p className="text-center text-xs text-default-400 -mt-2">
          {filterLabel} のデッキ使用率
        </p>

        {/* グラフ + 凡例 */}
        {isLoading && !stat ? (
          <div
            className="flex items-center justify-center"
            style={{ height: CHART_SIZE + EXTERNAL_SPRITE_PADDING_Y * 2 }}
          >
            <span className="text-xs text-default-400">読み込み中...</span>
          </div>
        ) : decks.length === 0 ? (
          <DeckUsageEmptyState
            message={
              "この期間の対戦記録がまだありません。\n記録を作成するとデッキ使用率が表示されます。"
            }
          />
        ) : (
          <>
            {/* グラフ領域＋詳細カード。選択時はグラフを左に寄せ、右側に詳細カードを表示する（グラフには重ねない） */}
            <div className="flex items-stretch gap-3">
              <div
                onClick={handleChartAreaClick}
                className={`relative shrink-0 transition-all duration-300 ${isLoading ? "opacity-30" : "opacity-100"} ${tooltip ? "w-3/5" : "w-full"}`}
                style={{ height: chartSize + spritePaddingY * 2 }}
              >
                <Pie
                  ref={chartRef}
                  data={chartData}
                  options={chartOptions}
                  plugins={[spritePlugin, centerSpritePlugin]}
                />
              </div>

              {/* タップしたデッキの詳細（再タップで閉じて円グラフのみの表示に戻す。閉じる際は右にフェードアウトする） */}
              <AnimatePresence>
                {tooltip && (
                  <motion.div
                    key="deck-detail"
                    onClick={closeDetail}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-1 min-w-0 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-default-200 bg-content1 px-2 py-3 shadow-sm cursor-pointer"
                    style={{ borderLeftColor: tooltip.color, borderLeftWidth: 4 }}
                  >
                    <DeckSprites deck={tooltip.deck} />
                    <p className="text-xs font-bold text-default-700 text-center truncate w-full">
                      {tooltip.deck.name}
                    </p>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-default-400">使用率</span>
                      <span className="text-lg font-black tabular-nums leading-none text-default-700">
                        {(tooltip.deck.usage_rate * 100).toFixed(1)}
                        <span className="text-xs font-bold">%</span>
                      </span>
                      <span className="text-[10px] text-default-400">
                        ({tooltip.deck.count}件)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 mt-1.5 pt-3 border-t border-default-200 w-full">
                      <span className="text-[10px] font-bold text-default-400">勝率</span>
                      <span
                        className={`text-base font-black tabular-nums ${winRateTextColor(tooltip.deck.win_rate)}`}
                      >
                        {(tooltip.deck.win_rate * 100).toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-default-400">
                        {tooltip.deck.wins}勝{tooltip.deck.losses}敗
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 凡例リスト（スプライト画像 + デッキ名 + 使用率） */}
            <div className="flex flex-col gap-1.5">
              {displayDecks.map((deck, idx) => (
                <div
                  key={deck.deck_id || `unknown-${idx}`}
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
                    {deck.name}
                  </span>
                  <div className="flex flex-col items-end gap-1 shrink-0 pl-2 border-l border-default-200">
                    <span className="font-black text-xs text-default-700 tabular-nums">
                      {(deck.usage_rate * 100).toFixed(1)}%({deck.count}件)
                    </span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={winRateChipColor(deck.win_rate)}
                      classNames={{
                        base: "h-4 px-0.5",
                        content: "text-[9px] font-black tabular-nums px-1",
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
