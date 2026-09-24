"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button, Card, CardBody, Chip, Tab, Tabs } from "@heroui/react";
import {
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsDown,
  LuSwords,
  LuUsers,
} from "react-icons/lu";

import DeckSprites from "@app/components/molecules/DeckSprites";
import FetchError from "@app/components/molecules/FetchError";
import {
  WeeklyDeckUsageBetaNote,
  WeeklyDeckUsageGroupingNote,
  WeeklyDeckUsageNotes,
  WeeklyDeckUsageRankingHeader,
  WeeklyDeckUsageRateNote,
} from "@app/components/organisms/DeckMeta/WeeklyDeckUsageTexts";
import {
  WeeklyDeckUsageRankingSkeleton,
  WeeklyDeckUsageSummarySkeleton,
} from "@app/components/organisms/DeckMeta/Skeleton/WeeklyDeckUsagePanelSkeleton";

import {
  normalizeDeckUsageGrouping,
  UI_DEFAULT_DECK_USAGE_GROUPING,
} from "@app/utils/deckUsageGrouping";
import { generateWeekOptions, lastWeekValue } from "@app/utils/week";
import {
  WeeklyDeckUsageGroupingType,
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
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-default-100 text-default-400 text-[0.625rem] font-black shrink-0">
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
      className={`flex items-center justify-center w-6 h-6 rounded-full text-[0.6875rem] font-black shrink-0 ${style}`}
    >
      {rank}
    </span>
  );
}

// 前週からの順位変動。上昇は▲、下降は▼、変動なしは−、前週圏外(新登場)は NEW。
function RankDelta({ rank, previousRank }: { rank: number; previousRank?: number }) {
  if (previousRank == null) {
    return (
      <span className="text-[0.5rem] font-black text-warning-500 leading-none">NEW</span>
    );
  }

  const diff = previousRank - rank;
  if (diff === 0) {
    return <span className="text-[0.5625rem] font-bold text-default-300 leading-none">－</span>;
  }

  const up = diff > 0;
  return (
    <span
      className={`text-[0.5625rem] font-black tabular-nums leading-none ${
        up ? "text-success-600" : "text-danger-500"
      }`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(diff)}
    </span>
  );
}

// 前週からの変化量をポイント差(+1.2pt / -0.8pt)で表示する。前週値が無ければ何も出さない。
function DeltaPoints({
  current,
  previous,
  unit = "",
}: {
  current: number;
  previous?: number;
  /** 数値の後ろに付ける単位表記（例: "pt"） */
  unit?: string;
}) {
  if (previous == null) return null;

  const diff = (current - previous) * 100;
  if (Math.abs(diff) < 0.05) {
    return (
      <span className="text-[0.5625rem] font-bold tabular-nums text-default-300">
        ±0.0{unit}
      </span>
    );
  }

  const up = diff > 0;
  return (
    <span
      className={`text-[0.5625rem] font-bold tabular-nums ${
        up ? "text-success-600" : "text-danger-500"
      }`}
    >
      {up ? "+" : ""}
      {diff.toFixed(1)}
      {unit}
    </span>
  );
}


// 行に束ねられた内訳の1件（「その他」に集約された変種／1体目でまとめた行の組み合わせ）。
// rank は「その他」の内訳だけに渡す（畳まれる前の順位を引き継ぐ）。渡さない場合も
// 番号の枠は残し、どちらの内訳でもスプライトの位置が揃うようにする。
//
// 「1体目でまとめる」表示では、「その他」の内訳(1体目でまとめた変種)がさらに組み合わせの
// 内訳を持つ。その他へ落ちた行は1体目しか出ていないため、何と組んだデッキだったのかは
// ここを開かないと分からない。行そのものを押して開く形にしたのは、1段目のような専用の
// ボタン行を内訳の行ごとに足すと、行数が多い(実測で44行)ぶん縦に倍伸びるため。
function BreakdownRow({
  item,
  rank,
  usageRate,
  rateNote,
  nested = false,
}: {
  item: WeeklyDeckUsageItemType;
  rank?: number;
  // 表示中の算出基準に合わせた使用率と、その分母を示す注記
  usageRate: number;
  rateNote: string;
  // さらに内訳として開かれた行。番号の枠を出さず、インデントのぶんだけ幅を返す
  nested?: boolean;
}) {
  const members = item.members ?? [];
  const canExpand = members.length > 0;
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);

  const row = (
    <div
      className={`flex items-center gap-2 rounded-lg bg-default-50 px-2 py-1.5 ${
        canExpand ? "cursor-pointer hover:bg-default-100" : ""
      }`}
      {...(canExpand
        ? {
            role: "button",
            tabIndex: 0,
            "aria-expanded": expanded,
            onClick: toggle,
            onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
              }
            },
          }
        : {})}
    >
      {/* 開閉の目印は番号の下に置く(親の行が順位の下に変動を出しているのと同じ形)。
          スプライトの横に足すと、その幅のぶん狭い画面で使用率と勝率が収まらなくなる */}
      {!nested && (
        <span className="flex w-6 shrink-0 flex-col items-center gap-0.5">
          <span className="text-[0.625rem] font-black tabular-nums text-default-400">
            {rank ?? ""}
          </span>
          {canExpand && (
            <LuChevronDown
              className={`h-3 w-3 text-default-400 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          )}
        </span>
      )}
      <DeckSprites sprites={item.pokemon_sprites} size={32} />
      <div className="ml-auto flex flex-col items-end shrink-0 leading-none">
        <span className="text-sm font-black tabular-nums text-default-600">
          {(usageRate * 100).toFixed(1)}
          <span className="text-[0.625rem] font-bold text-default-400">%</span>
        </span>
        <span className="text-[0.5625rem] text-default-400 tabular-nums mt-0.5">
          {item.count}件・{rateNote}
        </span>
      </div>
      <Chip
        size="sm"
        variant="flat"
        color={winRateChipColor(item.win_rate)}
        classNames={{
          base: "h-5 px-0.5 shrink-0",
          content: "text-[0.625rem] font-bold tabular-nums px-1.5",
        }}
      >
        勝率 {(item.win_rate * 100).toFixed(1)}%
      </Chip>
    </div>
  );

  if (!canExpand) return row;

  return (
    <div className="flex flex-col gap-1">
      {row}
      {/* 組み合わせ単位の内訳。使用率の基準は親の行から引き継ぐ
          (「その他」の内訳は常に全体件数が分母) */}
      {expanded && (
        <div className="ml-4 flex flex-col gap-1 border-l-2 border-default-200 pl-2">
          {members.map((member, idx) => (
            <BreakdownRow
              key={`${member.fingerprint || "combination"}-${idx}`}
              item={member}
              usageRate={member.usage_rate}
              rateNote={rateNote}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
  // URLの grouping パラメータがあれば初期表示の集計単位として引き継ぐ。
  // 無ければ「1体目でまとめる」から見せる
  const [grouping, setGrouping] = useState<WeeklyDeckUsageGroupingType>(() =>
    normalizeDeckUsageGrouping(
      searchParams.get("grouping"),
      UI_DEFAULT_DECK_USAGE_GROUPING,
    ),
  );
  const [stat, setStat] = useState<WeeklyDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 取得に失敗したか。失敗時は集計を捨ててエラー表示に切り替える
  // (前の週の数字が新しい週の見出しのまま残ると、その週の集計として読めてしまう)
  const [isError, setIsError] = useState(false);
  // 「再読み込み」で取り直すためのキー。増やすと取得のeffectが走り直す
  const [reloadKey, setReloadKey] = useState(0);
  // 内訳アコーディオンの開閉状態。行ごとに独立して開けるよう指紋の集合で持つ
  // （「その他」行の指紋は空文字）。1体目でまとめた表示では複数の行が内訳を持つため、
  // 単一の真偽値だと別の行を開いたときに前の行が畳まれてしまう。
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  function toggleExpanded(fingerprint: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(fingerprint)) {
        next.delete(fingerprint);
      } else {
        next.add(fingerprint);
      }
      return next;
    });
  }

  // 週や集計単位を切り替えたら内訳アコーディオンは畳んでおく
  // （別の集計結果の展開状態を持ち越さない。まとめ方を変えると内訳の中身ごと変わる）。
  // effect で畳むと開いたままの描画が一度挟まるので、前回の値を控えて描画中に畳む
  const [prevKey, setPrevKey] = useState(`${week}/${grouping}`);
  if (prevKey !== `${week}/${grouping}`) {
    setPrevKey(`${week}/${grouping}`);
    setExpandedKeys(new Set<string>());
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchStat() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (week) params.set("week", week);
        params.set("grouping", grouping);

        const res = await fetch(`/api/deck_meta/weekly_usage?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) {
            setStat(null);
            setIsError(true);
          }
          return;
        }

        const data: WeeklyDeckUsageStatType = await res.json();
        if (!cancelled) {
          setStat(data);
          setIsError(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setStat(null);
          setIsError(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchStat();
    return () => {
      cancelled = true;
    };
  }, [week, grouping, reloadKey]);

  const decks = useMemo(() => stat?.decks ?? [], [stat]);

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
      <CardBody className="gap-4 p-3">
        {/* β機能の注記 */}
        <WeeklyDeckUsageBetaNote />

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
              name="weekly-deck-usage-week"
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

        {/* デッキのまとめ方(集計単位)。データに依らない操作なので、週セレクタと同じく
            読み込み中も実物を出して切り替えられるようにする */}
        <div className="flex flex-col gap-1.5">
          <Tabs
            fullWidth
            size="sm"
            selectedKey={grouping}
            onSelectionChange={(key) => setGrouping(key as WeeklyDeckUsageGroupingType)}
            classNames={{ tab: "h-7", tabContent: "font-bold text-xs" }}
          >
            <Tab key="first_sprite" title="1体目でまとめる" />
            <Tab key="exact" title="組み合わせ別" />
          </Tabs>
          <WeeklyDeckUsageGroupingNote grouping={grouping} />
        </div>

        {/* 母集団の明示(初回読み込み中は同寸のスケルトンを置き、完了時にレイアウトが跳ねないようにする) */}
        {isLoading && stat == null && <WeeklyDeckUsageSummarySkeleton />}
        {stat != null && (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-default-400">{periodLabel}</span>
            <div className="flex items-center justify-center gap-4 rounded-xl bg-default-50 px-4 py-2 w-full">
              <div className="flex items-center gap-1.5">
                <LuUsers className="w-3.5 h-3.5 text-default-400 shrink-0" />
                <span className="text-xs font-black text-default-600 tabular-nums">
                  {stat.contributor_count}
                  <span className="text-[0.625rem] font-medium text-default-400 ml-0.5">
                    人
                  </span>
                </span>
              </div>
              <div className="w-px h-3.5 bg-default-200" />
              <div className="flex items-center gap-1.5">
                <LuSwords className="w-3.5 h-3.5 text-default-400 shrink-0" />
                <span className="text-xs font-black text-default-600 tabular-nums">
                  のべ{stat.total_votes}
                  <span className="text-[0.625rem] font-medium text-default-400 ml-0.5">
                    件
                  </span>
                </span>
              </div>
            </div>
            <WeeklyDeckUsageNotes />
          </div>
        )}

        {/* 使用率の分母の説明(固定文言。読み込み中も同じものを出す) */}
        <WeeklyDeckUsageRateNote />

        {/* ランキングの並び順を明示（読み込み中もレイアウトが動かないよう表示しておく） */}
        {(isLoading || displayDecks.length > 0) && <WeeklyDeckUsageRankingHeader />}

        {/* ランキング */}
        {isError ? (
          // 読み込み中の骨格・データなしと同じ高さの枠に収める(差し替わりで下がずれないように)
          <div className="h-48 flex items-center justify-center">
            <FetchError
              message="週間デッキ使用率を取得できませんでした"
              onRetry={() => setReloadKey((key) => key + 1)}
              isRetrying={isLoading}
              compact
            />
          </div>
        ) : isLoading && !stat ? (
          <WeeklyDeckUsageRankingSkeleton
            limit={limit}
            // 内訳を開けるのは個別ページ(limit 無し)だけ。実体の canExpand と同じ条件
            withBreakdown={limit == null && grouping === "first_sprite"}
          />
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
              // バーの幅は使用率(%)をそのまま反映する（最上位デッキ基準の相対値だと
              // 実際の割合より過大な幅になり、表示中の%表記と食い違うため）
              const barWidth = Math.min(
                100,
                Math.max(2, Math.round(deck.usage_rate * 100)),
              );

              // 内訳をアコーディオンで開ける行:
              //  - 「その他」: 集約された少数変種(中身は行だけでは一切見えないので常に開ける)
              //  - 1体目でまとめた行: 束ねる前の組み合わせ。行は1体目しか出していないため、
              //    組み合わせが1種類しかない行でも2体目が分かるという新しい情報になる
              // 全体を俯瞰する埋め込み(limit指定)では畳んだままにし、詳細ページでのみ展開可能にする
              const members = deck.members ?? [];
              const canExpand = limit == null && members.length > 0;
              const isExpanded = expandedKeys.has(deck.fingerprint);

              return (
                <div
                  key={`${deck.fingerprint || "other"}-${idx}`}
                  className="flex flex-col gap-1.5 rounded-xl bg-default-100 px-3 py-2"
                >
                  {/* 上段(使用率)と下段(バー・勝率)を同じ列構成のグリッドに載せ、
                      バーの右端が使用率カラムの開始位置に、各数値が全行で縦に揃うようにする。
                      列: [可変(スプライト/バー)][3.5rem(使用率/勝率チップ)][2.5rem(前週差・件数)] */}
                  <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.5rem] items-center gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col items-center gap-0.5 shrink-0 w-6">
                        <RankBadge rank={idx + 1} isOther={isOther} />
                        {/* 変動の行は行全体の高さを決める。変動が無い「その他」でも、
                            文字の小さい NEW(text-[0.5rem])でも縮まないよう枠で固定する */}
                        <span className="flex h-[0.5625rem] items-center">
                          {!isOther && (
                            <RankDelta rank={idx + 1} previousRank={deck.previous_rank} />
                          )}
                        </span>
                      </div>
                      <DeckSprites sprites={deck.pokemon_sprites} size={32} />
                      {isOther && (
                        <span className="font-bold text-xs text-default-500 truncate">
                          その他
                        </span>
                      )}
                    </div>
                    {/* 使用率を主指標として大きく強調表示する */}
                    <span className="text-right text-lg font-black tabular-nums text-default-700 leading-none">
                      {(deck.usage_rate * 100).toFixed(1)}
                      <span className="text-xs font-bold text-default-400">%</span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5 leading-none">
                      {/* 前週差の無い行(NEW等)も高さを確保して件数の位置を揃える */}
                      <span className="flex h-3 items-center">
                        <DeltaPoints
                          current={deck.usage_rate}
                          previous={deck.previous_usage_rate}
                          unit="pt"
                        />
                      </span>
                      <span className="text-[0.5625rem] text-default-400 tabular-nums">
                        ({deck.count}件)
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_2.5rem] items-center gap-1">
                    <div className="h-1.5 rounded-full bg-default-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOther ? "bg-default-400/60" : "bg-primary/70"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    {/* 勝率は補助情報として控えめに表示する。固定幅で全行の位置を揃える。
                        文字は 9px(前週差・件数と同サイズ)。10px だと「勝率 100.0%」(実測56.7px)が
                        3.5rem(56px)のチップからはみ出す */}
                    <Chip
                      size="sm"
                      variant="flat"
                      color={isOther ? "default" : winRateChipColor(deck.win_rate)}
                      classNames={{
                        base: "h-5 w-full max-w-none px-0",
                        content:
                          "w-full text-center text-[0.5625rem] font-bold tabular-nums px-0",
                      }}
                    >
                      勝率 {(deck.win_rate * 100).toFixed(1)}%
                    </Chip>
                    {/* 前週差が無い行(NEW等)でも列幅と行の高さが保たれ、
                        バーの長さも下段の高さも全行で揃う */}
                    <span className="flex h-3 items-center justify-end">
                      <DeltaPoints
                        current={deck.win_rate}
                        previous={deck.previous_win_rate}
                        unit="pt"
                      />
                    </span>
                  </div>

                  {/* 束ねた内訳をアコーディオンで一覧表示する。
                      「その他」行は集約された少数変種(3件未満)、1体目でまとめた行は
                      束ねる前の組み合わせ(2体目違いの派生)が並ぶ */}
                  {canExpand && (
                    <div className="flex flex-col gap-1 mt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(deck.fingerprint)}
                        aria-expanded={isExpanded}
                        className="flex items-center justify-center gap-1 py-1 text-[0.625rem] font-bold text-default-500 hover:text-default-600"
                      >
                        <LuChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                        {isExpanded
                          ? "内訳を閉じる"
                          : isOther
                            ? `内訳をすべて見る（${members.length}種類）`
                            : `組み合わせの内訳を見る（${members.length}種類）`}
                      </button>

                      {isExpanded && (
                        <div className="flex flex-col gap-1">
                          {members.map((member, mIdx) => {
                            // 内訳も行と同じく全体件数を分母にする
                            // （1体目でまとめた行は内訳の合計が行の使用率に一致する）
                            return (
                              <BreakdownRow
                                key={`${member.fingerprint || "member"}-${mIdx}`}
                                item={member}
                                // 「その他」の内訳だけは畳まれる前の順位を引き継ぐ
                                // （その他行の次の順位から連番）。1体目でまとめた行の
                                // 内訳は順位を持たないので番号を出さない
                                rank={isOther ? idx + 1 + mIdx : undefined}
                                usageRate={member.usage_rate}
                                rateNote="全体比"
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* limit指定時、6位以下がある場合は個別ページへ誘導する */}
            {hiddenCount > 0 && (
              <Button
                as={Link}
                href={`/deck_meta?week=${week}&grouping=${grouping}`}
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
