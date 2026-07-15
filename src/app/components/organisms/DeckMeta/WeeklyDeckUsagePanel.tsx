"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button, Card, CardBody, Chip, Tab, Tabs } from "@heroui/react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronsDown,
  LuSwords,
  LuUsers,
} from "react-icons/lu";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { generateWeekOptions, lastWeekValue } from "@app/utils/week";
import {
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";

// 勝率に応じた色分け（既存の統計表示と同じ閾値に合わせる）
function winRateChipColor(rate: number): "success" | "default" | "warning" | "danger" {
  if (rate >= 0.55) return "success";
  if (rate >= 0.45) return "default";
  if (rate >= 0.4) return "warning";
  return "danger";
}

// 上位3件をメダル配色で強調する（4位以降・その他は通常のニュートラル配色）
function RankBadge({ rank, isOther }: { rank: number; isOther: boolean }) {
  if (isOther) {
    return (
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-default-100 text-default-400 text-[10px] font-black shrink-0">
        ―
      </span>
    );
  }

  const style =
    rank === 1
      ? "bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/40"
      : rank === 2
        ? "bg-default-300/30 text-default-500 ring-1 ring-default-300/60"
        : rank === 3
          ? "bg-orange-400/20 text-orange-700 ring-1 ring-orange-400/40"
          : "bg-default-100 text-default-400";

  return (
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black shrink-0 ${style}`}
    >
      {rank}
    </span>
  );
}

// デッキ変種のスプライトを最大2体まで横並び表示する。不足分は unknown で埋める。
function DeckSprites({ deck }: { deck: WeeklyDeckUsageItemType }) {
  const sprites = deck.pokemon_sprites ?? [];
  const shown = sprites.slice(0, 2);
  const fillers = Math.max(0, 2 - shown.length);

  // サイズはデッキ使用率分析・相手デッキ分布のリスト(size=32)と揃える
  return (
    <div className="flex items-center gap-0 shrink-0">
      {shown.map((sprite, idx) => (
        <PokemonSprite key={`${sprite.id}-${idx}`} id={sprite.id} size={32} />
      ))}
      {Array.from({ length: fillers }).map((_, idx) => (
        <PokemonSprite key={`filler-${idx}`} size={32} />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-default-100 px-3 py-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-default-200 shrink-0" />
        <div className="w-20 h-9 rounded-lg bg-default-200 shrink-0" />
        <div className="ml-auto w-12 h-6 rounded-lg bg-default-200 shrink-0" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-default-200" />
        <div className="w-14 h-5 rounded-full bg-default-200 shrink-0" />
      </div>
    </div>
  );
}

// 使用率の算出基準（全体件数を分母にするか、「その他」を除いた件数を分母にするか）
type RateMode = "all" | "excl_other";

type Props = {
  // 指定時は上位N件のみ表示し、以降は個別ページへの誘導に置き換える（ダッシュボード埋め込み用）
  limit?: number;
};

export default function WeeklyDeckUsagePanel({ limit }: Props) {
  const weekOptions = useMemo(() => generateWeekOptions(12), []);
  const searchParams = useSearchParams();
  // URLの week パラメータがあれば初期表示週として引き継ぐ（「N位以下を見る」からの遷移時など）
  const [week, setWeek] = useState<string>(() => {
    const weekParam = searchParams.get("week");
    return weekParam && weekOptions.some((o) => o.value === weekParam)
      ? weekParam
      : lastWeekValue();
  });
  const [stat, setStat] = useState<WeeklyDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rateMode, setRateMode] = useState<RateMode>("all");

  useEffect(() => {
    let cancelled = false;

    async function fetchStat() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (week) params.set("week", week);

        const res = await fetch(`/api/deck_meta/weekly_usage?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: WeeklyDeckUsageStatType = await res.json();
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
  }, [week]);

  const decks = useMemo(() => stat?.decks ?? [], [stat]);

  // 「その他」の件数と、それを除いた場合の母数（分母）を算出する
  const otherCount = useMemo(
    () => decks.find((d) => d.fingerprint === "")?.count ?? 0,
    [decks],
  );
  const exclOtherTotal = (stat?.total_votes ?? 0) - otherCount;

  // 集計はサーバー側で使用率(count)降順・同数は勝率降順に整列済みだが、
  // UI 側でも念のため同じ規則で安定ソートする。「その他」は fingerprint が空で常に末尾へ。
  const displayDecks = useMemo(
    () =>
      [...decks].sort((a, b) => {
        const aOther = a.fingerprint === "" ? 1 : 0;
        const bOther = b.fingerprint === "" ? 1 : 0;
        if (aOther !== bOther) return aOther - bOther;
        if (a.count !== b.count) return b.count - a.count;
        return b.win_rate - a.win_rate;
      }),
    [decks],
  );

  // limit指定時は上位N件のみ表示し、残りは個別ページへの誘導に置き換える
  const visibleDecks = useMemo(
    () => (limit != null ? displayDecks.slice(0, limit) : displayDecks),
    [displayDecks, limit],
  );
  const hiddenCount = displayDecks.length - visibleDecks.length;

  const periodLabel =
    stat != null && stat.week_start
      ? `${stat.week_start} 〜 ${stat.week_end} の週`
      : (weekOptions.find((o) => o.value === week)?.label ?? week);

  // 週セレクタの前後移動（weekOptions は新しい週が先頭 = index 0）
  const currentIndex = weekOptions.findIndex((o) => o.value === week);
  const canGoOlder = currentIndex !== -1 && currentIndex < weekOptions.length - 1;
  const canGoNewer = currentIndex > 0;

  function stepWeek(delta: number) {
    if (currentIndex === -1) return;
    const idx = currentIndex + delta;
    if (idx < 0 || idx >= weekOptions.length) return;
    setWeek(weekOptions[idx].value);
  }

  return (
    <Card className="shadow-md">
      <CardBody className="gap-4 p-4">
        {/* β機能の注記 */}
        <div className="flex items-center gap-2">
          <Chip
            size="sm"
            color="warning"
            variant="flat"
            classNames={{ base: "h-5 px-0.5", content: "text-[10px] font-black px-1.5" }}
          >
            β機能
          </Chip>
          <span className="text-[11px] text-default-400 leading-snug">
            プラットフォーム全体の週次デッキ使用率
            <br />
            (集計方法や表示仕様は今後変わる可能性があります)
          </span>
        </div>

        {/* 週セレクタ（前後移動ボタン付き） */}
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            isDisabled={!canGoOlder}
            onPress={() => stepWeek(1)}
            aria-label="前の週"
          >
            <LuChevronLeft className="w-4 h-4" />
          </Button>

          <div className="relative flex-1">
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {weekOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
              ▼
            </span>
          </div>

          <Button
            isIconOnly
            size="sm"
            variant="flat"
            isDisabled={!canGoNewer}
            onPress={() => stepWeek(-1)}
            aria-label="次の週"
          >
            <LuChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* 母集団の明示 */}
        {stat != null && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-default-400">{periodLabel}</span>
            <div className="flex items-center justify-center gap-4 rounded-xl bg-default-50 px-4 py-2 w-full">
              <div className="flex items-center gap-1.5">
                <LuUsers className="w-3.5 h-3.5 text-default-400 shrink-0" />
                <span className="text-xs font-black text-default-600 tabular-nums">
                  {stat.contributor_count}
                  <span className="text-[10px] font-medium text-default-400 ml-0.5">
                    人
                  </span>
                </span>
              </div>
              <div className="w-px h-3.5 bg-default-200" />
              <div className="flex items-center gap-1.5">
                <LuSwords className="w-3.5 h-3.5 text-default-400 shrink-0" />
                <span className="text-xs font-black text-default-600 tabular-nums">
                  のべ{stat.total_votes}
                  <span className="text-[10px] font-medium text-default-400 ml-0.5">
                    件
                  </span>
                </span>
              </div>
            </div>
            <span className="text-[10px] text-default-300 leading-snug text-center">
              ※自分・相手それぞれのデッキを1件として
              <br />
              集計するため、対戦数より多くなっています
            </span>
          </div>
        )}

        {/* 使用率の算出基準切り替え（全体件数基準 / その他を除いた件数基準） */}
        {stat != null && (
          <div className="flex flex-col gap-1.5">
            <Tabs
              fullWidth
              size="sm"
              selectedKey={rateMode}
              onSelectionChange={(key) => setRateMode(key as RateMode)}
              classNames={{ tab: "h-7", tabContent: "font-bold text-xs" }}
            >
              <Tab key="all" title="全体の中の割合" />
              <Tab key="excl_other" title="その他を除いた割合" />
            </Tabs>
            <span className="text-[10px] text-default-400 leading-snug text-center">
              {rateMode === "all"
                ? "「その他」を含む全体件数を分母に算出しています"
                : `「その他」(${otherCount}件)を除いた${exclOtherTotal}件を分母に算出しています`}
            </span>
          </div>
        )}

        {/* ランキングの並び順を明示（読み込み中もレイアウトが動かないよう表示しておく） */}
        {(isLoading || displayDecks.length > 0) && (
          <div className="flex items-center justify-between px-1 -mb-2">
            <span className="text-[11px] font-black text-default-500">
              使用率ランキング
            </span>
            <span className="text-[10px] text-default-400">
              使用率が高い順（同率は勝率順）
            </span>
          </div>
        )}

        {/* ランキング */}
        {isLoading && !stat ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : displayDecks.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <span className="text-xs text-default-400 text-center px-4">
              この週の公開可能なデータはまだありません。
              <br />
              記録が集まると使用率が表示されます。
            </span>
          </div>
        ) : (
          <div
            className={`flex flex-col gap-1.5 transition-opacity duration-300 ${
              isLoading ? "opacity-30" : "opacity-100"
            }`}
          >
            {visibleDecks.map((deck, idx) => {
              const isOther = deck.fingerprint === "";
              // 「その他を除く」表示では、その他自身は分母から外れており%が定義できない
              const isExcluded = isOther && rateMode === "excl_other";
              const displayRate = isExcluded
                ? null
                : rateMode === "all"
                  ? deck.usage_rate
                  : deck.count / (exclOtherTotal || 1);
              // バーの幅は表示中の割合(%)をそのまま反映する（最上位デッキ基準の相対値だと
              // 実際の割合より過大な幅になり、表示中の%表記と食い違うため）
              const barWidth = isExcluded
                ? 0
                : Math.min(100, Math.max(2, Math.round((displayRate ?? 0) * 100)));

              return (
                <div
                  key={`${deck.fingerprint || "other"}-${idx}`}
                  className="flex flex-col gap-1.5 rounded-xl bg-default-100 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <RankBadge rank={idx + 1} isOther={isOther} />
                    <DeckSprites deck={deck} />
                    {isOther && (
                      <span className="font-bold text-xs text-default-500 truncate">
                        その他
                      </span>
                    )}
                    {/* 使用率を主指標として大きく強調表示する */}
                    <div className="ml-auto flex flex-col items-end shrink-0 leading-none">
                      {isExcluded ? (
                        <span className="text-xs font-bold text-default-400">
                          集計対象外
                        </span>
                      ) : (
                        <span className="text-lg font-black tabular-nums text-default-700">
                          {(displayRate! * 100).toFixed(1)}
                          <span className="text-xs font-bold text-default-400">%</span>
                        </span>
                      )}
                      {/* 「その他を除く」表示中は、基準の違いを見失わないよう全体比も併記する */}
                      <span className="text-[9px] text-default-400 tabular-nums mt-0.5">
                        {isExcluded
                          ? `${deck.count}件・全体の${(deck.usage_rate * 100).toFixed(1)}%`
                          : rateMode === "excl_other"
                            ? `${deck.count}件・全体比${(deck.usage_rate * 100).toFixed(1)}%`
                            : `${deck.count}件`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-default-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOther ? "bg-default-400/60" : "bg-primary/70"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    {/* 勝率は補助情報として控えめに表示する */}
                    <Chip
                      size="sm"
                      variant="flat"
                      color={isOther ? "default" : winRateChipColor(deck.win_rate)}
                      classNames={{
                        base: "h-5 px-0.5 shrink-0",
                        content: "text-[10px] font-bold tabular-nums px-1.5",
                      }}
                    >
                      勝率 {(deck.win_rate * 100).toFixed(1)}%
                    </Chip>
                  </div>
                </div>
              );
            })}

            {/* limit指定時、6位以下がある場合は個別ページへ誘導する */}
            {hiddenCount > 0 && (
              <Button
                as={Link}
                href={`/deck_meta?week=${week}`}
                variant="flat"
                color="default"
                radius="lg"
                className="h-10 text-xs font-bold text-default-500"
                startContent={<LuChevronsDown className="w-3.5 h-3.5" />}
              >
                {visibleDecks.length + 1}位以下を見る（あと{hiddenCount}件）
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
