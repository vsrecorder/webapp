"use client";

import { useEffect, useState } from "react";

import { ModalBody, ModalContent, ModalHeader, Spinner } from "@heroui/react";

import { Modal } from "@app/components/atoms/AppModal";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import FetchError from "@app/components/molecules/FetchError";
import BreakdownRow from "@app/components/organisms/DeckMeta/DeckUsageBreakdownRow";
import {
  loadWeeklyDeckUsageTrendMembers,
  peekWeeklyDeckUsageTrendMembers,
} from "@app/components/organisms/DeckMeta/weeklyDeckUsageTrendLoader";

import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { weekRangeLabel } from "@app/utils/week";
import { DeckUsageTrendRange } from "@app/utils/weeklyDeckUsageTrend";

import {
  WeeklyDeckUsageTrendMembersType,
  WeeklyDeckUsageTrendSeriesType,
  WeeklyDeckUsageTrendWeekType,
} from "@app/types/weekly_deck_usage_trend";

// 内訳の一覧の高さ。組み合わせの数(1〜十数件)や読み込み状態でシートの大きさが
// 変わらないよう固定し、収まらない分はこの中だけをスクロールする
const LIST_HEIGHT_PX = 360;

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  // ヘッダーを下へドラッグして閉じるために使う
  onClose: () => void;
  range: DeckUsageTrendRange;
  // 推移グラフで選んだ系列。閉じる途中も中身を保つため、選択を外しても直前の系列を渡す
  series: WeeklyDeckUsageTrendSeriesType | null;
  weeks: WeeklyDeckUsageTrendWeekType[];
  limit: number;
};

// "2026-09-14" → "9/14"
function shortDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

// 記録のある最新の週(期間の中で、既定で開く週)
function latestWeekWithRecords(series: WeeklyDeckUsageTrendSeriesType | null): number {
  if (!series) return 0;
  for (let i = series.points.length - 1; i >= 0; i--) {
    if (series.points[i].count > 0) return i;
  }
  return series.points.length - 1;
}

/*
 * 使用率順位の推移で選んだ系列(1体目でまとめたデッキ)の、組み合わせの内訳シート。
 * 上に期間の週を並べて切り替え、選んだ週の「2体目まで含めた組み合わせ」を件数順に出す。
 * 行の見た目はランキングの内訳と同じ部品(BreakdownRow)を使う。
 *
 * 内訳は選んだ系列ぶんだけを別 API で取る(推移の応答には含めない)。
 * 線を選んだ時点でパネルが先読みしているので、開いたときには届いていることが多い。
 */
export default function WeeklyDeckUsageTrendMembersSheet({
  isOpen,
  onOpenChange,
  onClose,
  range,
  series,
  weeks,
  limit,
}: Props) {
  const attachHeader = useModalDragToClose(onClose);
  const fingerprint = series?.fingerprint ?? null;

  const [reloadKey, setReloadKey] = useState(0);

  // 表示する週。系列か期間が変わったら、記録のある最新の週に戻す
  const [weekIdx, setWeekIdx] = useState(() => latestWeekWithRecords(series));
  const seriesKey = `${fingerprint}/${range.from}/${range.to}`;
  const [prevSeriesKey, setPrevSeriesKey] = useState(seriesKey);
  if (prevSeriesKey !== seriesKey) {
    setPrevSeriesKey(seriesKey);
    setWeekIdx(latestWeekWithRecords(series));
    // 「再読み込み」で取り直すのは、押したときの系列だけ
    setReloadKey(0);
  }

  /*
   * 内訳の取得。先読み(線を選んだ時点でパネルが始める)で届いていれば、描画中にそのまま
   * 参照して待たずに出す。届いていなければ取りに行き、結果は「どの取得の結果か」を
   * 添えて持つ(系列・期間を変えた直後に、前の系列の内訳や失敗を出さないため)。
   * 「再読み込み」(reloadKey)のときは控えを使わずに取り直す。
   */
  const requestKey =
    isOpen && fingerprint
      ? `${fingerprint}/${range.from}/${range.to}/${reloadKey}`
      : null;
  const cached =
    requestKey && fingerprint && reloadKey === 0
      ? peekWeeklyDeckUsageTrendMembers(range, fingerprint)
      : undefined;
  const [result, setResult] = useState<{
    key: string;
    data?: WeeklyDeckUsageTrendMembersType;
    error?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!requestKey || !fingerprint || cached) return;

    let cancelled = false;
    loadWeeklyDeckUsageTrendMembers(range, fingerprint, { fresh: reloadKey > 0 })
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, data });
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setResult({ key: requestKey, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, fingerprint, cached, range, reloadKey]);

  const settled = result?.key === requestKey ? result : null;
  const current = cached ?? settled?.data ?? null;
  const isError = !current && settled?.error === true;
  const week = weeks[weekIdx];
  const point = series?.points[weekIdx];
  const weekMembers = current?.weeks[weekIdx];

  const rankLabel = (rank: number | null | undefined, count: number | undefined) =>
    rank != null ? `${rank}位` : count ? "圏外" : "―";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClose={onClose}
      placement="bottom"
      scrollBehavior="inside"
      hideCloseButton
    >
      <ModalContent>
        {() => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader
              ref={attachHeader}
              className="flex flex-col gap-1 cursor-grab touch-none"
            >
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />
              <div className="flex items-center gap-2">
                <PokemonSprite id={series?.pokemon_sprites[0]?.id} size={36} />
                <div className="flex min-w-0 flex-col">
                  <span>組み合わせの内訳</span>
                  <span className="text-[0.6875rem] font-normal leading-snug text-default-400">
                    「1体目が同じデッキ」としてまとめた中を、2体目ごとに分けています
                  </span>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="gap-3 pb-6">
              {/* 期間の週。記録の無い週は選べない */}
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {weeks.map((w, i) => {
                  const p = series?.points[i];
                  const hasRecords = (p?.count ?? 0) > 0;
                  const selected = i === weekIdx;
                  return (
                    <button
                      key={w.week}
                      type="button"
                      disabled={!hasRecords}
                      aria-pressed={selected}
                      onClick={() => setWeekIdx(i)}
                      className={`flex w-12 shrink-0 flex-col items-center rounded-lg py-1 leading-tight transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : hasRecords
                            ? "bg-default-100 text-default-600"
                            : "bg-default-50 text-default-300"
                      }`}
                    >
                      <span className="text-[0.5625rem] tabular-nums">
                        {shortDate(w.week)}
                      </span>
                      {/* 推移グラフの範囲(上位 limit 位)より下の週は控えめに出す */}
                      <span
                        className={`text-xs font-black tabular-nums ${
                          !selected && p?.rank != null && p.rank > limit
                            ? "opacity-50"
                            : ""
                        }`}
                      >
                        {rankLabel(p?.rank, p?.count)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 選んだ週のまとめ(この系列の順位・使用率・件数) */}
              {week && (
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 px-1">
                  <span className="text-xs font-bold text-default-600">
                    {weekRangeLabel(week.week)} の週
                  </span>
                  <span className="text-[0.6875rem] tabular-nums text-default-400">
                    {rankLabel(point?.rank, point?.count)}
                    {point?.usage_rate != null &&
                      `・使用率 ${(point.usage_rate * 100).toFixed(1)}%`}
                    {point?.count ? `（${point.count}件）` : ""}
                  </span>
                </div>
              )}

              <div className="overflow-y-auto" style={{ height: LIST_HEIGHT_PX }}>
                {isError ? (
                  <div className="flex h-full items-center justify-center">
                    <FetchError
                      message="組み合わせの内訳を取得できませんでした"
                      onRetry={() => setReloadKey((key) => key + 1)}
                      isRetrying={false}
                      compact
                    />
                  </div>
                ) : !current ? (
                  <div className="flex h-full items-center justify-center">
                    <Spinner size="sm" />
                  </div>
                ) : !weekMembers || weekMembers.members.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-default-400">
                    この週の記録はありません
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {weekMembers.members.map((member, i) => (
                      <BreakdownRow
                        key={`${member.fingerprint}-${i}`}
                        item={member}
                        usageRate={member.usage_rate}
                        rateNote="全体比"
                        nested
                      />
                    ))}
                  </div>
                )}
              </div>

              <span className="text-center text-[0.625rem] leading-snug text-default-400">
                使用率はその週の全体件数が分母です。
                <br />
                内訳を合計するとこのデッキの使用率になります
              </span>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
