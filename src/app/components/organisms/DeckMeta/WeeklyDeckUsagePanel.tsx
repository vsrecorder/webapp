"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, CardBody, Chip, Image } from "@heroui/react";

import { spriteImageUrl, spriteScaleClass } from "@app/utils/sprite";
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

// デッキ変種のスプライトを最大2体まで横並び表示する。不足分は unknown で埋める。
function DeckSprites({ deck }: { deck: WeeklyDeckUsageItemType }) {
  const sprites = deck.pokemon_sprites ?? [];
  const shown = sprites.slice(0, 2);
  const fillers = Math.max(0, 2 - shown.length);

  return (
    <div className="flex items-center gap-0 shrink-0">
      {shown.map((sprite, idx) => (
        <Image
          key={`${sprite.id}-${idx}`}
          alt={sprite.id}
          src={spriteImageUrl(sprite.id)}
          className={`w-8 h-8 object-contain ${spriteScaleClass(sprite.id)} origin-bottom`}
        />
      ))}
      {Array.from({ length: fillers }).map((_, idx) => (
        <Image
          key={`filler-${idx}`}
          alt="unknown"
          src={spriteImageUrl(null)}
          className="w-8 h-8 object-contain scale-150 origin-bottom"
        />
      ))}
    </div>
  );
}

export default function WeeklyDeckUsagePanel() {
  const weekOptions = useMemo(() => generateWeekOptions(12), []);
  const [week, setWeek] = useState<string>(lastWeekValue);
  const [stat, setStat] = useState<WeeklyDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // 集計は count 降順で返るが、UI 側でも念のため安定ソートする。「その他」は fingerprint が空。
  const displayDecks = useMemo(
    () =>
      [...decks].sort((a, b) => {
        // その他（fingerprint 空）は常に末尾へ
        const aOther = a.fingerprint === "" ? 1 : 0;
        const bOther = b.fingerprint === "" ? 1 : 0;
        if (aOther !== bOther) return aOther - bOther;
        return b.count - a.count;
      }),
    [decks],
  );

  const periodLabel =
    stat != null && stat.week_start
      ? `${stat.week_start} 〜 ${stat.week_end} の週`
      : (weekOptions.find((o) => o.value === week)?.label ?? week);

  return (
    <Card>
      <CardBody className="gap-4 p-4">
        {/* アルファ版バッジ + 注記 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Chip size="sm" color="warning" variant="flat" classNames={{ content: "font-black" }}>
             試作中
            </Chip>
            <span className="text-sm font-bold text-default-700">対戦環境（週次デッキ使用率）</span>
          </div>
          <p className="text-[11px] text-default-400 leading-relaxed">
            プラットフォーム全体の対戦記録から集計した、週ごとのデッキ使用率です。アルファ版のため、
            集計ロジックや表示仕様は今後変わる可能性があります。数値はあくまで参考値としてご覧ください。
          </p>
        </div>

        {/* 週セレクタ */}
        <div className="relative">
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

        {/* 母集団の明示 */}
        {stat != null && (
          <p className="text-center text-xs text-default-400 -mt-1">
            {periodLabel} ／ バトレコ利用者 {stat.contributor_count} 人・{stat.total_votes} 票に基づく
          </p>
        )}

        {/* ランキング */}
        {isLoading && !stat ? (
          <div className="h-48 flex items-center justify-center">
            <span className="text-xs text-default-400">読み込み中...</span>
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
            {displayDecks.map((deck, idx) => {
              const isOther = deck.fingerprint === "";
              return (
                <div
                  key={`${deck.fingerprint || "other"}-${idx}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-1.5 bg-default-100"
                >
                  <span className="w-5 text-center text-xs font-black text-default-400 shrink-0">
                    {isOther ? "―" : idx + 1}
                  </span>
                  <div className="w-16 flex justify-center shrink-0">
                    <DeckSprites deck={deck} />
                  </div>
                  <span className="font-bold text-xs text-default-700 truncate flex-1 min-w-0">
                    {deck.label || (isOther ? "その他" : "（名称未設定）")}
                  </span>
                  <div className="flex flex-col items-end gap-1 shrink-0 pl-2 border-l border-default-200">
                    <span className="text-[10px] text-default-400 tabular-nums">
                      使用率 {(deck.usage_rate * 100).toFixed(1)}% ({deck.count}件)
                    </span>
                    {/* その他は勝率が意味を持たないためグレー表示にする */}
                    <Chip
                      size="sm"
                      variant="flat"
                      color={isOther ? "default" : winRateChipColor(deck.win_rate)}
                      classNames={{
                        base: "h-5 px-0.5",
                        content: "text-[11px] font-black tabular-nums px-1.5",
                      }}
                    >
                      勝率 {(deck.win_rate * 100).toFixed(1)}%
                    </Chip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
