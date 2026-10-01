"use client";

import { useState } from "react";

import { Chip, Skeleton } from "@heroui/react";
import { ModalContent, ModalHeader, ModalBody } from "@heroui/react";

import { LuExternalLink } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
import CopyableDeckCode from "@app/components/atoms/CopyableDeckCode";
import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";
import CardImageZoomOverlay from "@app/components/molecules/CardImageZoomOverlay";
import DeckSprites from "@app/components/molecules/DeckSprites";
import FetchError from "@app/components/molecules/FetchError";

import { useSimilarDecks } from "@app/hooks/useSimilarDecks";
import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { useModalEntered } from "@app/hooks/useModalEntered";

import {
  SimilarDeckType,
  SimilarDecksGetResponseType,
  SimilarDecksSourceType,
  SimilarDiffCardType,
} from "@app/types/similar_deck";

import { preDecodeCardImage } from "@app/utils/cardImage";
import { cityleagueRankLabel } from "@app/utils/cityleagueRank";
import { closingPassthroughClassNames } from "@app/utils/modal";
import {
  formatEventDateShort,
  similarDeckArchetypeName,
  vslabArchetypePageUrl,
  vslabSimilarPageUrl,
} from "@app/utils/similarDecks";

/*
 * デッキにカード構成が近いシティリーグの入賞デッキを、下からのシートで出す。
 * デッキ詳細(自分のデッキ)と、みんなの公開デッキの投稿カード(他人のデッキ)の両方から開く。
 *
 * 中身はバトラボの類似デッキ検索(BFF: /api/deckcards/{code}/similar)。類似度の高い順に
 * 並び、各行にデッキの種類(バトラボの分類)・自分のデッキとの差分カード・デッキ画像・
 * デッキコードを添える。差分カードのタグはタップするとそのカードの画像を出す
 * (バトラボがそのデッキに入っている印刷の画像 URL を添えてくる。cards[].imageUrl)。デッキ画像は最初から出す(見比べるのに画像がいちばん早い)。
 * 画面外の行の画像は lazy にして、開いた直後に 12 枚ぶんを一度に取りにいかない。
 *
 * 取りにいくのはシートを開いたとき。デッキ詳細を開いただけでは、デッキの中身を
 * バトラボ(と公式サイト)に渡さない。
 */

type Props = {
  code: string | null;
  // 検索元のデッキの呼び名。自分のデッキなら「あなたのデッキ」、公開デッキなら「このデッキ」。
  // 検索元の欄の見出しと、差分カードの「〜の方が多い」に使う
  sourceLabel?: string;
  // この日(JST の暦日 YYYY-MM-DD)の環境の入賞デッキと比べる。みんなの公開デッキは投稿日を渡す。
  // 省略するとバトラボが直近の環境で比べる(自分のデッキ・大会の入賞デッキ)
  environmentDate?: string | null;
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
          {/* 実物と同じ並び(スプライト＋デッキ名 → 類似度と大会の情報) */}
          <Skeleton className="h-6 w-2/3 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// 検索元(自分のデッキ)。種類と、比べた環境を出す
function SourceSummary({
  source,
  sourceLabel,
}: {
  source: SimilarDecksSourceType;
  sourceLabel: string;
}) {
  return (
    <div className="rounded-xl bg-default-100 px-3 py-2.5">
      <div className="text-tiny font-bold text-default-500">{sourceLabel}</div>
      <div className="mt-1 flex items-center gap-2">
        <DeckSprites sprites={source.archetype.sprites.map((id) => ({ id }))} size={36} />
        <div className="min-w-0">
          <div className="truncate font-bold text-small">
            {similarDeckArchetypeName(source.archetype) ?? "デッキ名：不明"}
          </div>
          <div className="text-tiny text-default-500">
            {source.environmentTitle} の入賞デッキと比較
          </div>
          {/* 同じカードリストで入賞していれば(デッキコードは違ってもよい)、
              その入賞は一覧の先頭に類似度 100% で並ぶ */}
          {source.placements > 0 && (
            <div className="text-tiny font-bold text-primary">
              同じカードリストで {source.placements} 回入賞しています
            </div>
          )}
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

/*
 * 差分カードの 1 段。見出しとカード名のタグを並べる。
 * タグは「+カード名 ×2」の形で、枚数の差を添える(枚数を返す前の古い応答では名前だけ)。
 * タグはタップでそのカードの画像(そのデッキに入っている印刷。バトラボが添えてくる)を出す
 */
function DiffCards({
  label,
  cards,
  sign,
  chipClassName,
  onSelectCard,
}: {
  label: string;
  cards: SimilarDiffCardType[];
  sign: string;
  chipClassName: string;
  onSelectCard: (card: SimilarDiffCardType) => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold text-default-500">{label}</div>
      <div className="mt-0.5 flex flex-wrap gap-1">
        {cards.map((card) => (
          <button
            key={card.name}
            type="button"
            onClick={() => onSelectCard(card)}
            aria-label={`${card.name}のカード画像を表示する`}
            className={`cursor-zoom-in rounded-md px-1.5 py-1 text-[11px] active:opacity-70 ${chipClassName}`}
          >
            {sign}
            {card.name}
            {/* 枚数を付ける前の BFF の応答が Data Cache に残っていると count が無い(undefined) */}
            {card.count ? ` ×${card.count}` : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimilarDeckRow({
  deck,
  sourceArchetypeId,
  environmentId,
  sourceLabel,
  onSelectCard,
}: {
  deck: SimilarDeckType;
  sourceArchetypeId: string | null;
  environmentId: string;
  sourceLabel: string;
  onSelectCard: (card: SimilarDiffCardType) => void;
}) {
  const percent = percentLabel(deck.similarity);
  const archetypeName = similarDeckArchetypeName(deck.archetype);
  const hasDiff = deck.cards.in.length > 0 || deck.cards.out.length > 0;

  return (
    <li className="flex flex-col gap-2 border-t border-divider py-3 first:border-t-0">
      <div>
        {/* 何のデッキかを先に見せ、その下に類似度と大会の情報を置く */}
        <div className="flex items-center gap-2">
          <DeckSprites sprites={deck.archetype.sprites.map((id) => ({ id }))} size={24} />
          <span className="min-w-0 truncate text-small font-bold">
            {archetypeName ?? "デッキ名：不明"}
          </span>
          {deck.sameList && (
            <Chip size="sm" color="primary" variant="flat" className="h-5 shrink-0 text-[10px]">
              同じカードリスト
            </Chip>
          )}
          {/* 構成は近いが分類上は別の種類。自分の種類が決まっていないときは比べようが無いので出さない */}
          {sourceArchetypeId && !deck.sameArchetype && deck.archetype.archetypeId && (
            <Chip size="sm" variant="bordered" className="h-5 shrink-0 text-[10px]">
              別のデッキ種類
            </Chip>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {/* 「類似度 93.5%」。数字だけだと何の割合か分からないので名前を添える。
              幅は「類似度 100.0%」が収まる大きさに固定し、行ごとにバーの始まりを揃える */}
          <span className="w-22 shrink-0 whitespace-nowrap text-small">
            <span className="text-tiny text-default-500">類似度</span>{" "}
            <span className="font-bold tabular-nums">{percent}</span>
          </span>
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
        </div>
        {/* 差分カード。入賞デッキの方が多いカードと、自分のデッキの方が多いカードを
            上下の段に分ける(1 行に混ぜると、どちらのカードか色でしか見分けられないため)。
            片方にしか無いカードだけでなく、両方に入っていて枚数が違うカードも並ぶので
            「〜にだけある」とは書かない */}
        {hasDiff && (
          <div className="mt-2 flex flex-col gap-1.5">
            {deck.cards.in.length > 0 && (
              <DiffCards
                label="入賞デッキの方が多い"
                cards={deck.cards.in}
                sign="+"
                chipClassName="bg-success-50 text-success-700"
                onSelectCard={onSelectCard}
              />
            )}
            {deck.cards.out.length > 0 && (
              <DiffCards
                label={`${sourceLabel}の方が多い`}
                cards={deck.cards.out}
                sign="−"
                chipClassName="bg-danger-50 text-danger-700"
                onSelectCard={onSelectCard}
              />
            )}
          </div>
        )}
      </div>
      <ZoomableDeckImage
        code={deck.deckCode}
        alt={`${archetypeName ?? "入賞デッキ"}（${deck.deckCode}）`}
        loading="lazy"
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
    </li>
  );
}

function SimilarDecksList({
  data,
  sourceLabel,
}: {
  data: SimilarDecksGetResponseType;
  sourceLabel: string;
}) {
  const { source, similar, candidates, images } = data;

  /*
   * タップされた差分カード。閉じても残すのは、退場アニメーションのあいだも画像を出したままに
   * するため(消してしまうと、画像だけ先に消えて空の枠が縮んでいく)。開いているかは別に持つ
   */
  const [selectedCard, setSelectedCard] = useState<SimilarDiffCardType | null>(null);
  const [isCardImageOpen, setIsCardImageOpen] = useState(false);

  /*
   * カード画像の URL。差分カードにはバトラボが「そのデッキに入っている印刷」の画像を
   * 添えてくる(cards[].imageUrl)ので、タップした瞬間に出せる。
   * 無いとき(索引に画像が無いカード・cards を返す前の古い応答)は images(種類の代表画像)を
   * 控えにする。代表画像は絵柄が違うことがあるので、あくまで控え
   */
  const cardImageUrl = selectedCard
    ? (selectedCard.imageUrl ?? images?.[selectedCard.name] ?? null)
    : null;

  // 差分カードがどこかの行にあるか。タップで画像が出ることの案内を出すかの判定に使う
  const hasDiffCards = similar.some(
    (deck) => deck.cards.in.length > 0 || deck.cards.out.length > 0,
  );

  return (
    <>
      <SourceSummary source={source} sourceLabel={sourceLabel} />
      {similar.length === 0 ? (
        <div className="rounded-xl bg-default-100 px-3 py-4 text-center text-small text-default-600">
          類似している入賞デッキが見つかりませんでした
        </div>
      ) : (
        <>
          <div className="px-1 text-tiny text-default-500">
            候補 {candidates} 件から上位 {similar.length} 件
            {/* タグが押せることは見ただけでは分からないので、一覧の先頭で一度だけ添える
                (各行に書くと 12 件ぶん繰り返してしまう) */}
            {hasDiffCards && <span>・カード名をタップで画像</span>}
          </div>
          <ul className="px-1">
            {similar.map((deck) => (
              <SimilarDeckRow
                key={deck.entryId}
                deck={deck}
                sourceArchetypeId={source.archetype.archetypeId}
                environmentId={source.environmentId}
                sourceLabel={sourceLabel}
                onSelectCard={(card) => {
                  setSelectedCard(card);
                  const url = card.imageUrl ?? images?.[card.name] ?? null;
                  if (!url) {
                    setIsCardImageOpen(true);
                    return;
                  }
                  // 画像が手元に届くのを少しだけ待ってから開く(理由は utils/cardImage.ts の PRE_DECODE_WAIT_MS)
                  void preDecodeCardImage(url).then(() => setIsCardImageOpen(true));
                }}
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

      {/* 差分カードのタグをタップしたときのカード画像。カードリストのカードを
          タップしたときと同じモーダルで、このシートの上に重なる */}
      <CardImageZoomOverlay
        cardName={selectedCard?.name ?? ""}
        imageUrl={cardImageUrl}
        isOpen={isCardImageOpen}
        onClose={() => setIsCardImageOpen(false)}
      />
    </>
  );
}

export default function DisplaySimilarDecksModal({
  code,
  sourceLabel = "あなたのデッキ",
  environmentDate = null,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const attachHeader = useModalDragToClose(onClose);

  // 入場アニメーションが着地するまで一覧の実体化を遅らせる
  // (着地前に大きなコミットが走るとシートの動きが止まるため)。
  const entered = useModalEntered(isOpen);

  const { data, loading, error, retry } = useSimilarDecks(isOpen ? code : null, environmentDate);

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

              <div>類似している入賞デッキ</div>
            </ModalHeader>
            <ModalBody className="px-3 pt-1 pb-6 flex flex-col gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
              {showSkeleton ? (
                <SimilarDecksSkeleton />
              ) : error ? (
                <FetchError
                  message="類似している入賞デッキを取得できませんでした"
                  onRetry={retry}
                  compact
                />
              ) : data?.kind === "unavailable" ? (
                <div className="rounded-xl bg-default-100 px-3 py-4 text-center text-small text-default-600">
                  {data.message}
                </div>
              ) : data?.kind === "ok" ? (
                <SimilarDecksList data={data.data} sourceLabel={sourceLabel} />
              ) : null}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
