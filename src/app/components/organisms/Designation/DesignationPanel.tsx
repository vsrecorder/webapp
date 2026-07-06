"use client";

import { useEffect, useState, Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/react";
import { LuLock, LuTriangleAlert } from "react-icons/lu";

import {
  DesignationLadderItemType,
  DesignationRankStatsType,
  UserDesignationType,
} from "@app/types/designation";
import { UserPlayerType } from "@app/types/user_player";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { RANKS, rankForTier, NO_RANK_IMAGE } from "@app/utils/designationRank";
import {
  seasonOptionsFromChampionshipSeries,
  currentSeasonValue,
} from "@app/utils/season";

// バックエンド(internal/usecase/designation.go)の criteria_type 定数と一致させる値。
// いずれもプレイヤーズクラブ連携済みのプレイヤーIDで、公式サイトの結果(cityleague_results)を
// 参照して判定する(ベテラン・熟練者)。
const CITY_LEAGUE_PLACEMENT_CRITERIA_TYPE = "official_city_league_placement";
const CITY_LEAGUE_FINAL_TOURNAMENT_CRITERIA_TYPE = "official_city_league_playoff";

// プレイヤーズクラブ連携が達成判定の前提となる criteria_type かどうか。
function requiresPlayerLink(criteriaType: string): boolean {
  return (
    criteriaType === CITY_LEAGUE_PLACEMENT_CRITERIA_TYPE ||
    criteriaType === CITY_LEAGUE_FINAL_TOURNAMENT_CRITERIA_TYPE
  );
}

// description は「称号:【🔰 見習い】を持っており、(本来の達成条件)」という
// 前提称号込みの一文でバックエンドから届く。前提部分を分離して表示するためのパース。
const PREREQUISITE_DESCRIPTION_PATTERN = /^称号[:：]【(\S+)\s+(.+?)】を持っており、\s*([\s\S]*)$/;

function parseDescription(description: string): {
  prerequisiteEmoji: string;
  prerequisiteName: string;
  criteriaText: string;
} | null {
  const match = description.match(PREREQUISITE_DESCRIPTION_PATTERN);
  if (!match) return null;

  const [, prerequisiteEmoji, prerequisiteName, criteriaText] = match;
  return { prerequisiteEmoji, prerequisiteName, criteriaText };
}

type Props = {
  userId: string;
  championshipSeries: ChampionshipSeriesType[];
};

// 称号ロードマップの1行あたりの表示数。この数を境に折り返し、蛇行(スネーク)状に並べる。
const LADDER_ROW_SIZE = 5;

// count個のティアを LADDER_ROW_SIZE 個ずつの行に分割する(tier昇順のまま)。
function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function ProgressBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div className="w-full h-2 rounded-full bg-default-200 overflow-hidden">
        <div className="h-full bg-primary/70" style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs text-default-400 tabular-nums">
        {label} {value} / {max}
      </span>
    </div>
  );
}

function DesignationTile({
  item,
  index,
  isCurrent,
  onSelect,
}: {
  item: DesignationLadderItemType;
  index: number;
  isCurrent: boolean;
  onSelect: (item: DesignationLadderItemType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`relative flex w-full flex-col items-center gap-1 p-2 rounded-xl text-center transition-transform active:scale-95 ${
        isCurrent
          ? "bg-warning/15 ring-2 ring-warning"
          : item.achieved
            ? "bg-default-100"
            : "bg-default-50"
      }`}
      aria-label={`${item.name}の詳細を見る`}
    >
      {isCurrent && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-warning text-white text-[7px] font-bold whitespace-nowrap shadow-sm">
          現在地
        </span>
      )}
      <span
        className={`absolute top-0.5 left-0.5 flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold ${
          item.achieved ? "bg-warning/20 text-warning" : "bg-default-200 text-default-400"
        }`}
      >
        {index + 1}
      </span>
      {item.achieved ? (
        <span className="text-xl leading-none">{item.emoji}</span>
      ) : (
        <LuLock className="w-5 h-5 text-default-300" />
      )}
      <span
        className={`w-full truncate text-[8px] font-bold leading-tight ${
          item.achieved ? "text-default-600" : "text-default-300"
        }`}
      >
        {item.name}
      </span>
    </button>
  );
}

export default function DesignationPanel({ userId, championshipSeries }: Props) {
  const [data, setData] = useState<UserDesignationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<DesignationLadderItemType | null>(null);
  const [season, setSeason] = useState(() => currentSeasonValue(championshipSeries));
  const [rankStats, setRankStats] = useState<DesignationRankStatsType | null>(null);
  // プレイヤーズクラブ連携状態(称号詳細モーダルでの案内表示に使う)。null は読み込み中。
  const [isPlayerLinked, setIsPlayerLinked] = useState<boolean | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isRankInfoOpen,
    onOpen: onRankInfoOpen,
    onOpenChange: onRankInfoOpenChange,
  } = useDisclosure();

  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/users/${userId}/designation?season=${season}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [userId, season]);

  useEffect(() => {
    fetch("/api/userplayers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: UserPlayerType | null) => setIsPlayerLinked(data != null))
      .catch(() => setIsPlayerLinked(false));
  }, []);

  useEffect(() => {
    // ランク一覧モーダルを開いたときだけ取得する(通常表示では不要な集計クエリのため)
    if (!isRankInfoOpen) return;

    fetch(`/api/designations/stats?season=${season}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRankStats(d))
      .catch(() => setRankStats(null));
  }, [isRankInfoOpen, season]);

  function handleSelect(item: DesignationLadderItemType) {
    setSelected(item);
    onOpen();
  }

  // モンスターボール級以上のユーザー(=いずれかの称号ティアに到達したユーザー)のうち、
  // 指定ランクに属するユーザーの割合(%)。集計取得前・総数0件の場合は null。
  function rankPercentage(minTier: number, maxTier: number): number | null {
    if (!rankStats || rankStats.total_users <= 0) return null;

    const count = rankStats.tiers
      .filter((t) => t.tier >= minTier && t.tier <= maxTier)
      .reduce((sum, t) => sum + t.user_count, 0);

    return (count / rankStats.total_users) * 100;
  }

  // 指定ティア(=称号)単体に属するユーザーの割合(%)。集計取得前・総数0件の場合は null。
  function tierPercentage(tier: number): number | null {
    if (!rankStats || rankStats.total_users <= 0) return null;

    const count = rankStats.tiers.find((t) => t.tier === tier)?.user_count ?? 0;

    return (count / rankStats.total_users) * 100;
  }

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-6">
          <div className="flex items-center justify-end">
            <div className="w-52 h-7 rounded-xl bg-default-100 animate-pulse" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-2xl bg-default-100 animate-pulse" />
            <div className="flex flex-col items-center gap-1">
              <div className="w-14 h-2.5 rounded-full bg-default-100 animate-pulse" />
              <div className="w-24 h-5 rounded-full bg-default-100 animate-pulse" />
              <div className="w-28 h-3 rounded-full bg-default-100 animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-default-100 animate-pulse" />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  const current = data?.current ?? null;
  const ladder = data?.ladder ?? [];
  const rank = current ? rankForTier(current.tier) : null;
  const rankImage = rank?.image ?? NO_RANK_IMAGE;
  const rankImageAlt = rank?.name ?? "ランクなし";

  const ladderRows = chunkRows(ladder, LADDER_ROW_SIZE);

  return (
    <Card className="shadow-md">
      <CardBody className="p-4 flex flex-col gap-6">
        <div className="flex items-center justify-end">
          <div className="relative inline-block">
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="appearance-none rounded-xl border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {seasonOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-default-400 text-[10px]">
              ▼
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onRankInfoOpen}
            aria-label="ランクの一覧を見る"
            className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-warning/15 overflow-hidden shrink-0 transition-transform active:scale-95"
          >
            <Image
              src={rankImage}
              alt={rankImageAlt}
              fill
              sizes="80px"
              className="object-contain p-2"
            />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-default-400 uppercase tracking-wide">
              ランク
            </span>
            <span className="text-lg font-black text-default-700">
              {rank?.name ?? "なし"}
            </span>
            <span className="text-xs font-bold text-default-400 mt-0.5">
              称号: {current ? `${current.emoji} ${current.name}` : "称号なし"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {ladderRows.map((row, rowIndex) => {
            const reversed = rowIndex % 2 === 1;
            const displayRow = reversed ? [...row].reverse() : row;
            const connector = reversed ? "◀" : "▶";
            const isLastRow = rowIndex === ladderRows.length - 1;
            // 次の行への折り返し位置(偶数行なら右端の直下、奇数行なら左端の直下に次行が続く)
            const wrapVisualColumn = reversed ? 0 : displayRow.length - 1;

            return (
              <Fragment key={rowIndex}>
                <div className="flex items-stretch gap-1">
                  {displayRow.map((item, i) => {
                    const originalIndex =
                      rowIndex * LADDER_ROW_SIZE + (reversed ? row.length - 1 - i : i);
                    return (
                      <Fragment key={item.id}>
                        <div className="flex-1 min-w-0">
                          <DesignationTile
                            item={item}
                            index={originalIndex}
                            isCurrent={current?.id === item.id}
                            onSelect={handleSelect}
                          />
                        </div>
                        {i < displayRow.length - 1 && (
                          <span className="self-center shrink-0 text-warning/70 font-black text-xs">
                            {connector}
                          </span>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
                {!isLastRow && (
                  <div className="flex items-center gap-5">
                    {displayRow.map((_, i) => (
                      <div key={i} className="flex-1 flex items-center justify-center">
                        {i === wrapVisualColumn && (
                          <span className="text-warning/70 font-black text-xs leading-none">
                            ▼
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </CardBody>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" size="sm">
        <ModalContent>
          {selected && (
            <>
              <ModalHeader className="flex flex-col items-center gap-2 pt-6 pb-2">
                <div
                  className={`flex items-center justify-center w-14 h-14 rounded-full bg-warning/15 text-3xl ${
                    selected.achieved ? "" : "grayscale"
                  }`}
                >
                  {selected.emoji}
                </div>
                <span className="text-base font-black">{selected.name}</span>
              </ModalHeader>
              <ModalBody className="pb-6 pt-0 text-center gap-2">
                {(() => {
                  const parsed = parseDescription(selected.description);
                  const criteriaText = (parsed ? parsed.criteriaText : selected.description).replace(
                    /\//g,
                    " / ",
                  );

                  return (
                    <div className="flex flex-col items-stretch gap-1.5 w-full">
                      {parsed && (
                        <div className="flex items-center justify-center gap-1.5 self-center rounded-full bg-default-100 px-3 py-1 text-[11px] font-bold text-default-500">
                          <span>前提条件</span>
                          <span className="text-warning">
                            {parsed.prerequisiteEmoji} {parsed.prerequisiteName}
                          </span>
                          <span>達成済み</span>
                        </div>
                      )}
                      <p className="text-sm text-default-600 leading-relaxed text-left rounded-xl bg-default-50 p-3">
                        {criteriaText}
                      </p>
                    </div>
                  );
                })()}
                {selected.achieved ? (
                  <span className="text-xs font-bold text-warning">達成済み</span>
                ) : selected.criteria_type === "unimplemented" ? (
                  <p className="text-xs text-default-400 mt-1">準備中</p>
                ) : selected.criteria_type === "official_city_league_record" ? (
                  <div className="flex flex-col items-center gap-1.5 w-full mt-1">
                    <div className="flex flex-col items-center gap-1.5 w-full rounded-xl bg-default-50 p-2">
                      <span className="text-[10px] font-bold text-default-400">
                        前シーズンに引き続き記録した場合
                      </span>
                      <ProgressBar
                        label="前シーズン"
                        value={selected.previous_value}
                        max={selected.criteria_value}
                      />
                      <ProgressBar
                        label="今シーズン"
                        value={selected.current_value}
                        max={selected.criteria_value}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-default-300">または</span>
                    <div className="flex flex-col items-center gap-1.5 w-full rounded-xl bg-default-50 p-2">
                      <span className="text-[10px] font-bold text-default-400">
                        今シーズン単独で{selected.standalone_threshold}件以上記録した場合
                      </span>
                      <ProgressBar
                        label="今シーズン"
                        value={selected.current_value}
                        max={selected.standalone_threshold}
                      />
                    </div>
                  </div>
                ) : requiresPlayerLink(selected.criteria_type) && isPlayerLinked === false ? (
                  <div className="flex items-start justify-center gap-2 text-xs text-warning-600 bg-warning-50 rounded-xl p-3 mt-1 text-left">
                    <LuTriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {selected.city_league_record_without_player_link ? (
                        <>
                          シティリーグの記録は既にありますが、プレイヤーズクラブとの連携が完了していないため達成として判定されません。
                          <Link
                            href="/users"
                            className="font-bold underline underline-offset-2"
                          >
                            ユーザ情報
                          </Link>
                          から連携すると、この称号を達成できる可能性があります。
                        </>
                      ) : (
                        <>
                          この称号の達成判定には、プレイヤーズクラブとの連携が完了している必要があります。
                          <Link
                            href="/users"
                            className="font-bold underline underline-offset-2"
                          >
                            ユーザ情報
                          </Link>
                          から連携してください。
                        </>
                      )}
                    </span>
                  </div>
                ) : selected.missing_official_event_record ? (
                  <div className="flex items-start justify-center gap-2 text-xs text-warning-600 bg-warning-50 rounded-xl p-3 mt-1 text-left">
                    <LuTriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      公式サイトの結果は確認できましたが、対応する大会の記録がバトレコに見つかりません。該当する大会の記録を作成すると達成できます。
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 w-full mt-1">
                    <ProgressBar
                      label="今シーズン"
                      value={selected.current_value}
                      max={selected.criteria_value}
                    />
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isRankInfoOpen}
        onOpenChange={onRankInfoOpenChange}
        placement="center"
        size="sm"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col items-center gap-0.5 pt-5 pb-1">
            <span className="text-base font-black">称号とランクの関係</span>
            <span className="text-xs text-default-400">
              称号のティアが進むごとにランクアップします
            </span>
          </ModalHeader>
          <ModalBody className="pb-4 pt-0 max-h-[75vh] overflow-y-auto">
            {/* ボール画像だけを取り出した独立の階段オブジェクト(昇順=右にいくほど段が高くなる) */}
            <div className="flex items-end justify-center gap-2 w-full pt-1 pb-2">
              {RANKS.map((r, i) => {
                const isCurrentRank = rank === r.info;
                const stepHeight = 16 + i * 8;

                return (
                  <div key={r.info.name} className="flex flex-col items-center gap-1">
                    <div
                      className={`relative w-8 h-8 shrink-0 rounded-lg p-1 ${
                        isCurrentRank
                          ? "bg-warning/25 ring-2 ring-warning"
                          : "bg-warning/10"
                      }`}
                    >
                      <Image
                        src={r.info.image}
                        alt={r.info.name}
                        fill
                        sizes="32px"
                        className="object-contain"
                      />
                    </div>
                    <div
                      style={{ height: `${stepHeight}px` }}
                      className={`w-9 rounded-t-md ${
                        isCurrentRank ? "bg-warning/40" : "bg-default-100"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* ランクの詳細リスト(画像の階段とは別に、名称・対応称号を一覧表示) */}
            <div className="flex items-baseline justify-between px-1 mb-1">
              <span className="text-[11px] font-black text-default-500">
                ランク別の在籍割合
              </span>
              <span className="text-[9px] text-default-300">
                モンスターボール級以上のユーザーが対象
              </span>
            </div>
            <div className="flex flex-col gap-1 w-full">
              {[...RANKS].reverse().map((r) => {
                const isCurrentRank = rank === r.info;
                const rankTiers = ladder
                  .filter((item) => item.tier >= r.minTier && item.tier <= r.maxTier)
                  .sort((a, b) => b.tier - a.tier);
                const percentage = rankPercentage(r.minTier, r.maxTier);

                return (
                  <div
                    key={r.info.name}
                    className={`relative flex items-center gap-2 rounded-xl p-2 w-full ${
                      isCurrentRank
                        ? "bg-warning/15 ring-2 ring-warning"
                        : "bg-default-50"
                    }`}
                  >
                    {isCurrentRank && (
                      <span className="absolute -top-1.5 left-7 px-1.5 py-0.5 rounded-full bg-warning text-white text-[7px] font-bold whitespace-nowrap shadow-sm">
                        現在地
                      </span>
                    )}
                    <div className="relative w-7 h-7 shrink-0 rounded-lg bg-warning/15 p-1">
                      <Image
                        src={r.info.image}
                        alt={r.info.name}
                        fill
                        sizes="28px"
                        className="object-contain"
                      />
                    </div>
                    <div className="flex flex-col items-start shrink-0">
                      <span className="text-sm font-black text-default-700 leading-tight whitespace-nowrap">
                        {r.info.name}
                      </span>
                      <span
                        className={`text-sm font-black tabular-nums leading-tight whitespace-nowrap ${
                          isCurrentRank ? "text-warning" : "text-default-500"
                        }`}
                      >
                        {percentage !== null ? `${percentage.toFixed(1)}%` : "—"}
                      </span>
                    </div>
                    {rankTiers.length > 0 ? (
                      <div className="grid grid-cols-[1fr_2.75rem] items-center gap-x-1.5 gap-y-0.5 shrink-0 w-36 ml-auto">
                        {rankTiers.map((item) => {
                          const isCurrentTier = current?.id === item.id;
                          const itemPercentage = tierPercentage(item.tier);

                          return (
                            <Fragment key={item.id}>
                              <span
                                className={`text-[9px] truncate text-left ${
                                  isCurrentTier
                                    ? "font-bold text-warning"
                                    : "text-default-400"
                                }`}
                              >
                                {item.emoji} {item.name}
                              </span>
                              <span
                                className={`text-[9px] font-bold tabular-nums text-right ${
                                  isCurrentTier ? "text-warning" : "text-default-400"
                                }`}
                              >
                                {itemPercentage !== null
                                  ? `${itemPercentage.toFixed(1)}%`
                                  : "—"}
                              </span>
                            </Fragment>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[10px] text-default-400 truncate ml-auto w-36 text-right">
                        {`Tier ${r.minTier}〜${r.maxTier}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
}
