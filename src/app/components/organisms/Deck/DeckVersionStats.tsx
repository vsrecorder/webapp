"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { LuSwords, LuTrophy } from "react-icons/lu";

import { DeckCodeType } from "@app/types/deck_code";
import { DeckCodeUsageItemType, DeckCodeUsageStatType } from "@app/types/deck_usage_stat";
import {
  MIN_MATCHES_FOR_VERSION_WIN_RATE,
  hasEnoughMatchesForWinRate,
} from "@app/utils/deckVersionStats";

// 割合(0〜1)を小数点第1位までのパーセント表記にする(".0" は落とす)
function formatPercent(rate: number): string {
  const value = (rate * 100).toFixed(1);
  return `${value.endsWith(".0") ? value.slice(0, -2) : value}%`;
}

function formatRecord(usage: DeckCodeUsageItemType): string {
  return `${usage.wins}勝${usage.losses}敗${usage.draws > 0 ? `${usage.draws}分` : ""}`;
}

// バージョン一覧の各項目へスクロールするための要素ID
export function deckVersionElementId(deckCodeId: string): string {
  return `deck-version-${deckCodeId}`;
}

// 棒の最大の高さ(px)。勝率100%でこの高さになる
const BAR_MAX_HEIGHT = 56;

type OverviewProps = {
  // 全バージョン(新しい順)
  deckcodes: DeckCodeType[];
  usageStat: DeckCodeUsageStatType;
  bestId: string | null;
};

/*
 * バージョン一覧の先頭に置く、バージョンごとの勝率の推移。
 * 下の一覧と同じく新しい順に左から並べる。版が多いと横にスクロールするが、
 * 開いたときに最高勝率の版が見える位置までずらしておく(古い版だと右の画面外に出てしまうため)。
 * 勝率を出せるだけ対戦していない版は、棒を薄くして戦績の数だけ出す。
 * 列をタップすると、その版の詳細(一覧の該当項目)までスクロールする。
 */
export function DeckVersionWinRateOverview({
  deckcodes,
  usageStat,
  bestId,
}: OverviewProps) {
  const usageById = new Map(usageStat.deck_codes.map((u) => [u.deck_code_id, u]));

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bestColumnRef = useRef<HTMLLIElement | null>(null);

  // 左右にまだ隠れた列があるか。スクロールバーを出していないので、続きがある側の端を
  // うっすら暗くして、横にスクロールできることに気づけるようにする
  const [hiddenLeft, setHiddenLeft] = useState(false);
  const [hiddenRight, setHiddenRight] = useState(false);
  const updateEdges = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // 1px の余裕は、拡大表示などで scrollLeft が小数になり端に届き切らないことがあるため
    setHiddenLeft(scroller.scrollLeft > 1);
    setHiddenRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);
  }, []);

  // 最高勝率の列が右にはみ出しているときだけ、その列の右端が見えるところまでずらす。
  // 最小限のずらし方にするのは、左側(新しい版)をできるだけ見えたままにするため。
  // 描画前に合わせないと、左端で一度描かれてから飛ぶのが見えてしまう。
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const column = bestColumnRef.current;
    if (!scroller || !column) return;

    const columnRight = column.offsetLeft + column.offsetWidth;
    const visibleRight = scroller.scrollLeft + scroller.clientWidth;
    if (columnRight > visibleRight) {
      scroller.scrollLeft = columnRight - scroller.clientWidth;
    }
  }, [bestId, deckcodes.length]);

  // 版の増減・画面幅の変化(回転やモーダルの幅)で、はみ出すかどうかが変わるので測り直す。
  // 上の自動スクロールより後に宣言しているので、ずらした後の位置で測る
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [updateEdges, deckcodes.length]);

  return (
    <section className="mb-4 mx-1 rounded-xl bg-default-100 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-small">バージョンごとの勝率</div>
        {bestId && (
          <div className="flex items-center gap-1 text-tiny font-bold text-primary">
            <LuTrophy className="text-xs" />
            Ver.{deckcodes.length - deckcodes.findIndex((dc) => dc.id === bestId)}
            が最高勝率
          </div>
        )}
      </div>

      {/* 端の影はスクロールする箱の外側に重ねる(内側に置くと列と一緒に流れてしまう) */}
      <div className="relative">
        {/* relative は列の offsetLeft をこの箱基準にするため */}
        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="relative overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none"
        >
          <ol className="flex gap-1.5 min-w-max">
            {deckcodes.map((dc, index) => {
              const versionNo = deckcodes.length - index;
              const usage = usageById.get(dc.id);
              const enough = !!usage && hasEnoughMatchesForWinRate(usage);
              const isBest = dc.id === bestId;
              const barHeight = enough
                ? Math.max(4, Math.round(usage.win_rate * BAR_MAX_HEIGHT))
                : 4;

              return (
                <li key={dc.id} ref={isBest ? bestColumnRef : undefined}>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(deckVersionElementId(dc.id))
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    aria-label={`バージョン${versionNo}へ移動`}
                    className={`flex w-12 flex-col items-center gap-1 rounded-lg px-1 py-1.5 active:opacity-70 ${
                      isBest ? "bg-primary/10" : "bg-content1"
                    }`}
                  >
                    <span
                      className={`text-[0.6875rem] font-bold tabular-nums ${
                        isBest
                          ? "text-primary"
                          : enough
                            ? "text-foreground"
                            : "text-default-300"
                      }`}
                    >
                      {enough ? formatPercent(usage.win_rate) : "—"}
                    </span>
                    <div
                      className="flex w-5 items-end justify-center"
                      style={{ height: BAR_MAX_HEIGHT }}
                      aria-hidden
                    >
                      <div
                        className={`w-full rounded-t ${
                          isBest
                            ? "bg-primary"
                            : enough
                              ? "bg-default-400"
                              : "bg-default-200"
                        }`}
                        style={{ height: barHeight }}
                      />
                    </div>
                    <span className="text-[0.625rem] font-bold text-default-600">
                      Ver.{versionNo}
                    </span>
                    <span className="text-[0.625rem] text-default-400 tabular-nums">
                      {usage ? `${usage.count}戦` : "0戦"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-lg bg-linear-to-r from-black/25 via-black/8 to-transparent transition-opacity duration-200 dark:from-black/75 dark:via-black/30 ${
            hiddenLeft ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-linear-to-l from-black/25 via-black/8 to-transparent transition-opacity duration-200 dark:from-black/75 dark:via-black/30 ${
            hiddenRight ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <p className="text-[0.625rem] text-default-400">
        勝率は引き分けを除いて{MIN_MATCHES_FOR_VERSION_WIN_RATE}戦から表示します。
        {usageStat.unassigned_count > 0 &&
          `バージョンを指定せずに記録した${usageStat.unassigned_count}戦は含まれていません。`}
      </p>
    </section>
  );
}

type RecordProps = {
  usage: DeckCodeUsageItemType | undefined;
  isBest: boolean;
};

/*
 * バージョンのカード内に置く、その版で戦った戦績。
 * 勝率を出せるかどうかにかかわらず同じ1行・同じ並び(勝敗・勝率)にし、
 * 一覧を縦に流し見たときに版どうしで位置がずれないようにする。
 * 対戦が少なく勝率を出せない版は、勝率の位置に「—」を置く。
 */
export function DeckVersionRecordStrip({ usage, isBest }: RecordProps) {
  const hasMatches = !!usage && usage.count > 0;
  const enough = !!usage && hasEnoughMatchesForWinRate(usage);

  // カード内の他の行(デッキコード・カードリスト等)は白地で並ぶため、戦績だけ色地にして
  // 一覧を流し見たときに目に留まるようにする。最高勝率の版はさらに塗りつぶして際立たせる
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        isBest
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
          : "bg-primary/10 border border-primary/20"
      }`}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
          isBest ? "bg-white/20" : "bg-primary/15 text-primary"
        }`}
      >
        {isBest ? <LuTrophy className="text-lg" /> : <LuSwords className="text-lg" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={`text-tiny font-bold ${isBest ? "text-primary-foreground/80" : "text-primary"}`}
        >
          {isBest ? "このバージョンの戦績・最高勝率" : "このバージョンの戦績"}
        </span>
        <span
          className={`text-small font-bold tabular-nums ${
            isBest ? "" : hasMatches ? "text-foreground" : "text-default-400"
          }`}
        >
          {hasMatches ? formatRecord(usage) : "対戦なし"}
        </span>
      </div>
      <span
        className={`w-20 shrink-0 text-right text-2xl font-black tabular-nums ${
          isBest ? "" : enough ? "text-foreground" : "text-default-300"
        }`}
      >
        {enough ? formatPercent(usage.win_rate) : "—"}
      </span>
    </div>
  );
}
