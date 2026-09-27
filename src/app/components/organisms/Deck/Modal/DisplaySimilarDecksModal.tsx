"use client";

import { useState } from "react";

import { Chip, Skeleton } from "@heroui/react";
import { ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import { LuChevronDown, LuExternalLink } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import CopyableDeckCode from "@app/components/atoms/CopyableDeckCode";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";
import DeckSprites from "@app/components/molecules/DeckSprites";
import FetchError from "@app/components/molecules/FetchError";

import { useSimilarDecks } from "@app/hooks/useSimilarDecks";
import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { useModalEntered } from "@app/hooks/useModalEntered";

import { DeckCodeType } from "@app/types/deck_code";
import {
  SimilarDeckType,
  SimilarDecksGetResponseType,
  SimilarDecksSourceType,
} from "@app/types/similar_deck";

import { cityleagueRankLabel } from "@app/utils/cityleagueRank";
import { closingPassthroughClassNames } from "@app/utils/modal";
import {
  formatEventDateShort,
  vslabArchetypePageUrl,
  vslabSimilarPageUrl,
} from "@app/utils/similarDecks";

/*
 * 自分のデッキにカード構成が近いシティリーグの入賞デッキを、下からのシートで出す。
 *
 * 中身はバトラボの類似デッキ検索(BFF: /api/deckcards/{code}/similar)。類似度の高い順に
 * 並び、各行にデッキの種類(バトラボの分類)と、自分のデッキとの差分カードを添える。
 * 行を押すとデッキ画像とデッキコードが開く。
 *
 * 取りにいくのはシートを開いたとき。デッキ詳細を開いただけでは、デッキの中身を
 * バトラボ(と公式サイト)に渡さない。
 */

type Props = {
  deckcode: DeckCodeType | null;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

// 類似度を「93.5%」の形にする
function percentLabel(similarity: number): string {
  return `${(Math.round(similarity * 1000) / 10).toFixed(1)}%`;
}

function SimilarDecksSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-16 rounded-xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 py-2">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-6 w-2/3 rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// 検索元(自分のデッキ)。種類と、比べた環境を出す
function SourceSummary({ source }: { source: SimilarDecksSourceType }) {
  return (
    <div className="rounded-xl bg-default-100 px-3 py-2.5">
      <div className="text-tiny font-bold text-default-500">あなたのデッキ</div>
      <div className="mt-1 flex items-center gap-2">
        <DeckSprites sprites={source.archetype.sprites.map((id) => ({ id }))} size={36} />
        <div className="min-w-0">
          <div className="truncate font-bold text-small">
            {source.archetype.label ?? "デッキ名：不明"}
          </div>
          <div className="text-tiny text-default-500">
            {source.environmentTitle} の入賞デッキと比較
          </div>
        </div>
      </div>
      {/* カードマスタに無いカード(新弾の取り込み前など)。類似度から外れており、
          鍵のカードが抜けたまま誤った種類を出さないよう種類も判定していない */}
      {source.unresolved.length > 0 && (
        <p className="mt-2 text-tiny text-warning-600">
          照合できなかったカード(
          {source.unresolved.map((c) => `${c.name} ×${c.count}`).join("、")}
          )は類似度に含めていません。
          {source.archetypeSkipped && "デッキの種類も判定していません。"}
        </p>
      )}
    </div>
  );
}

function SimilarDeckRow({
  deck,
  sourceArchetypeId,
  environmentId,
}: {
  deck: SimilarDeckType;
  sourceArchetypeId: string | null;
  environmentId: string;
}) {
  // 行を押すとデッキ画像とデッキコードが開く(一覧の高さを抑えるため既定は閉じる)
  const [open, setOpen] = useState(false);
  const percent = percentLabel(deck.similarity);
  const hasDiff = deck.diffIn.length > 0 || deck.diffOut.length > 0;

  return (
    <li className="border-t border-divider first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full py-2.5 text-left active:opacity-70"
      >
        <div className="flex items-center gap-2">
          <span className="w-13 shrink-0 font-bold text-small tabular-nums">{percent}</span>
          <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-default-200">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: percent }}
            />
          </span>
          <span className="shrink-0 text-tiny text-default-500">
            {formatEventDateShort(deck.eventDate)} ・ {deck.prefectureName} ・{" "}
            {cityleagueRankLabel(deck.rank, false)}
          </span>
          <LuChevronDown
            className={`shrink-0 text-default-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <DeckSprites sprites={deck.archetype.sprites.map((id) => ({ id }))} size={24} />
          <span className="min-w-0 truncate text-small font-bold">
            {deck.archetype.label ?? "デッキ名：不明"}
          </span>
          {/* 構成は近いが分類上は別の種類。自分の種類が決まっていないときは比べようが無いので出さない */}
          {sourceArchetypeId && !deck.sameArchetype && deck.archetype.archetypeId && (
            <Chip size="sm" variant="bordered" className="h-5 shrink-0 text-[10px]">
              別のデッキ種類
            </Chip>
          )}
        </div>
        {hasDiff && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {deck.diffIn.map((name) => (
              <span
                key={`in-${name}`}
                className="rounded-md bg-success-50 px-1.5 py-0.5 text-[11px] text-success-700"
              >
                +{name}
              </span>
            ))}
            {deck.diffOut.map((name) => (
              <span
                key={`out-${name}`}
                className="rounded-md bg-danger-50 px-1.5 py-0.5 text-[11px] text-danger-700"
              >
                −{name}
              </span>
            ))}
          </div>
        )}
      </button>
      {open && (
        <div className="flex flex-col gap-2 pb-3">
          <ZoomableDeckImage
            code={deck.deckCode}
            alt={`${deck.archetype.label ?? "入賞デッキ"}（${deck.deckCode}）`}
          />
          <CopyableDeckCode code={deck.deckCode} label="コード" />
          {deck.archetype.archetypeId && (
            <a
              href={vslabArchetypePageUrl(deck.archetype.archetypeId, environmentId)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 self-start text-tiny text-primary underline-offset-2 hover:underline"
            >
              この種類の採用カード・入賞デッキをバトラボで見る
              <LuExternalLink />
            </a>
          )}
        </div>
      )}
    </li>
  );
}

function SimilarDecksList({ data }: { data: SimilarDecksGetResponseType }) {
  const { source, similar, candidates } = data;

  return (
    <>
      <SourceSummary source={source} />
      {similar.length === 0 ? (
        <div className="rounded-xl bg-default-100 px-3 py-4 text-center text-small text-default-600">
          似ている入賞デッキが見つかりませんでした
        </div>
      ) : (
        <>
          <div className="px-1 text-tiny text-default-500">
            候補 {candidates} 件から上位 {similar.length} 件。行を押すとデッキ画像とデッキコードが開きます
          </div>
          <ul className="px-1">
            {similar.map((deck) => (
              <SimilarDeckRow
                key={deck.deckCode}
                deck={deck}
                sourceArchetypeId={source.archetype.archetypeId}
                environmentId={source.environmentId}
              />
            ))}
          </ul>
        </>
      )}
      <a
        href={vslabSimilarPageUrl(source.deckCode, source.environmentId)}
        target="_blank"
        rel="noreferrer"
        className="mt-1 flex items-center justify-center gap-1 rounded-xl bg-default-100 py-2 text-small font-bold text-primary active:opacity-70"
      >
        バトラボで詳しく見る
        <LuExternalLink />
      </a>
    </>
  );
}

export default function DisplaySimilarDecksModal({
  deckcode,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const attachHeader = useModalDragToClose(onClose);

  // 入場アニメーションが着地するまで一覧の実体化を遅らせる
  // (着地前に大きなコミットが走るとシートの動きが止まるため)。
  const entered = useModalEntered(isOpen);

  const code = deckcode?.code ?? null;
  const { data, loading, error, retry } = useSimilarDecks(isOpen ? code : null);

  if (!code) {
    return null;
  }

  const showSkeleton = !entered || loading;

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      hideCloseButton
      isDismissable={false}
      onOpenChange={onOpenChange}
      onClose={() => {}}
      className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none"
      classNames={{
        base: "sm:max-w-full lg:max-w-2xl",
        closeButton: "text-xl",
        ...closingPassthroughClassNames(isOpen),
      }}
    >
      <ModalContent>
        {() => (
          <>
            {/* スワイプ検知 */}
            <ModalHeader
              ref={attachHeader}
              className="px-3 py-3 flex flex-col gap-1.5 cursor-grab touch-none"
            >
              {/* スワイプバー */}
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

              <div>似ている入賞デッキ</div>
            </ModalHeader>
            <ModalBody className="px-3 pt-1 pb-6 flex flex-col gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
              {showSkeleton ? (
                <SimilarDecksSkeleton />
              ) : error ? (
                <FetchError
                  message="似ている入賞デッキを取得できませんでした"
                  onRetry={retry}
                  compact
                />
              ) : data?.kind === "unavailable" ? (
                <div className="rounded-xl bg-default-100 px-3 py-4 text-center text-small text-default-600">
                  {data.message}
                </div>
              ) : data?.kind === "ok" ? (
                <SimilarDecksList data={data.data} />
              ) : null}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
