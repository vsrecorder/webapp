"use client";

import { useEffect, useState, Fragment } from "react";
import Image from "next/image";
import {
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/react";
import { LuLock } from "react-icons/lu";

import { DesignationLadderItemType, UserDesignationType } from "@app/types/designation";
import { RANKS, rankForTier, getCurrentSeason, NO_RANK_IMAGE } from "@app/utils/designationRank";

type Props = {
  userId: string;
  userCreatedAt?: string;
};

function generateSeasonOptions(createdAt?: Date): { value: string; label: string }[] {
  const now = new Date();
  const currentSeason = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const firstSeason = createdAt
    ? createdAt.getMonth() >= 8
      ? createdAt.getFullYear() + 1
      : createdAt.getFullYear()
    : currentSeason;
  const options: { value: string; label: string }[] = [];
  for (let s = currentSeason; s >= firstSeason; s--) {
    options.push({ value: String(s), label: `${s}シーズン` });
  }
  return options;
}

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

export default function DesignationPanel({ userId, userCreatedAt }: Props) {
  const [data, setData] = useState<UserDesignationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<DesignationLadderItemType | null>(null);
  const [season, setSeason] = useState(getCurrentSeason());
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isRankInfoOpen,
    onOpen: onRankInfoOpen,
    onOpenChange: onRankInfoOpenChange,
  } = useDisclosure();

  const seasonOptions = generateSeasonOptions(
    userCreatedAt ? new Date(userCreatedAt) : undefined,
  );

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

  function handleSelect(item: DesignationLadderItemType) {
    setSelected(item);
    onOpen();
  }

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-end">
            <div className="w-24 h-8 rounded-xl bg-default-100 animate-pulse" />
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
      <CardBody className="p-4 flex flex-col gap-3">
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
            <span className="text-[10px] text-default-300 mt-0.5">
              タップしてランク一覧を見る
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
                      rowIndex * LADDER_ROW_SIZE +
                      (reversed ? row.length - 1 - i : i);
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
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-warning/15 text-3xl">
                  {selected.achieved ? (
                    selected.emoji
                  ) : (
                    <LuLock className="w-7 h-7 text-default-300" />
                  )}
                </div>
                <span className="text-base font-black">{selected.name}</span>
              </ModalHeader>
              <ModalBody className="pb-6 pt-0 text-center gap-2">
                <p className="text-sm text-default-600">{selected.description}</p>
                {selected.achieved ? (
                  <span className="text-xs font-bold text-warning">達成済み</span>
                ) : selected.criteria_type === "unimplemented" ? (
                  <p className="text-xs text-default-400 mt-1">準備中</p>
                ) : (
                  <div className="flex flex-col items-center gap-1 w-full mt-1">
                    <div className="w-full h-2 rounded-full bg-default-200 overflow-hidden">
                      <div
                        className="h-full bg-primary/70"
                        style={{
                          width: `${
                            selected.criteria_value > 0
                              ? Math.min(
                                  100,
                                  Math.round(
                                    (selected.current_value / selected.criteria_value) * 100,
                                  ),
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-default-400 tabular-nums">
                      現在 {selected.current_value} / {selected.criteria_value}
                    </span>
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isRankInfoOpen} onOpenChange={onRankInfoOpenChange} placement="center" size="sm">
        <ModalContent>
          <ModalHeader className="flex flex-col items-center gap-1 pt-6 pb-2">
            <span className="text-base font-black">称号ランク</span>
            <span className="text-xs text-default-400">
              称号のティアが進むごとにランクアップします
            </span>
          </ModalHeader>
          <ModalBody className="pb-6 pt-0">
            {/* ボール画像だけを取り出した独立の階段オブジェクト(昇順=右にいくほど段が高くなる) */}
            <div className="flex items-end justify-center gap-3 w-full pt-2 pb-4">
              {RANKS.map((r, i) => {
                const isCurrentRank = rank === r.info;
                const stepHeight = 28 + i * 14;

                return (
                  <div key={r.info.name} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`relative w-10 h-10 shrink-0 rounded-xl p-1.5 ${
                        isCurrentRank ? "bg-warning/25 ring-2 ring-warning" : "bg-warning/10"
                      }`}
                    >
                      <Image
                        src={r.info.image}
                        alt={r.info.name}
                        fill
                        sizes="40px"
                        className="object-contain"
                      />
                    </div>
                    <div
                      style={{ height: `${stepHeight}px` }}
                      className={`w-12 rounded-t-md ${
                        isCurrentRank ? "bg-warning/40" : "bg-default-100"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* ランクの詳細リスト(画像の階段とは別に、名称・対応称号を一覧表示) */}
            <div className="flex flex-col gap-1.5 w-full">
              {[...RANKS].reverse().map((r) => {
                const isCurrentRank = rank === r.info;
                const tierNames = ladder
                  .filter((item) => item.tier >= r.minTier && item.tier <= r.maxTier)
                  .map((item) => `${item.emoji} ${item.name}`)
                  .join("・");

                return (
                  <div
                    key={r.info.name}
                    className={`relative flex items-center gap-3 rounded-2xl p-2.5 w-full ${
                      isCurrentRank ? "bg-warning/15 ring-2 ring-warning" : "bg-default-50"
                    }`}
                  >
                    {isCurrentRank && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-warning text-white text-[7px] font-bold whitespace-nowrap shadow-sm">
                        現在地
                      </span>
                    )}
                    <div className="relative w-8 h-8 shrink-0 rounded-lg bg-warning/15 p-1">
                      <Image
                        src={r.info.image}
                        alt={r.info.name}
                        fill
                        sizes="32px"
                        className="object-contain"
                      />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-xs font-black text-default-700">
                        {r.info.name}
                      </span>
                      <span className="text-[10px] text-default-400 truncate">
                        {tierNames || `Tier ${r.minTier}〜${r.maxTier}`}
                      </span>
                    </div>
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
