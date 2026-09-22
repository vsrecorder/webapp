"use client";

import { SetStateAction, Dispatch } from "react";

import { useDisclosure } from "@heroui/react";

import { LuLayoutGrid } from "react-icons/lu";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import CardListAccordion from "@app/components/organisms/Deck/CardListAccordion";
import { createLazyModal } from "@app/utils/lazyModal";

import { useDeckCodes } from "@app/hooks/useDeckCodes";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { isZeroDate } from "@app/utils/date";

// デッキ詳細モーダルは子モーダル9個と chart.js などを抱える。
// 初期JSと初期マウントから外すため、開くまで読み込まない(理由は createLazyModal を参照)。
const ShowDeckModal = createLazyModal(
  () => import("@app/components/organisms/Deck/Modal/ShowDeckModal"),
);

type Props = {
  deck: DeckGetByIdResponseType | null;
  setDeck: Dispatch<SetStateAction<DeckGetByIdResponseType | null>>;
  deckcode: DeckCodeType | null;
  setDeckCode: Dispatch<SetStateAction<DeckCodeType | null>>;
  enableShowDeckModal: boolean;
  // デッキには既存バージョンがあるが、この記録にはまだ紐づいていないとき、
  // 「使用したバージョンとして登録」CTAから呼ばれる（＝使用デッキ編集モーダルを開く）
  onSelectExistingVersion?: () => void;
  // デッキにバージョンが1件も無いとき、「デッキのバージョンを作成」CTAから呼ばれる
  // （＝新しいバージョンを作成モーダルを開く）
  onCreateVersion?: () => void;
  // デッキコードの下に、展開でカード内訳を見られるカードリストのアコーディオンを置く
  enableCardList?: boolean;
};

/*
 * 記録詳細ページ・記録情報モーダルの「デッキ情報」に置く、使用デッキの中身
 * (デッキ画像・デッキコード・カードリスト)。
 *
 * 枠(Card)では包まない。HeroUI の Card は rounded-large(14px) と overflow-hidden を持つので、
 * 余白なしで中身を入れると列の先頭にあるデッキ画像の上側と、末尾にあるカードリストの下側だけが
 * 14px で切り取られ、要素自身の角丸(8px)より丸くなる(間に挟まるデッキコード欄は縁に接しないので
 * 影響を受けず、場所取りの骨格 DeckCardSkeleton は枠を持たないので 8px のままになり、
 * 骨格と実体で角がズレていた)。
 *
 * デッキ名・スプライト・登録日・バージョン件数を見せるヘッダー付きの表示も持っていたが、
 * どの画面からも使われておらず(呼び出し元はいずれもヘッダー無しの表示を指定していた)、
 * ヒーローの「使用デッキ」と内容が重複するうえ、骨格がデッキ一覧のギャラリーカード用のものに
 * なっていて実体と噛み合わなかったため 2026-09-22 に廃止した。
 */
export default function UsedDeckCard({
  deck,
  setDeck,
  deckcode,
  setDeckCode,
  enableShowDeckModal,
  onSelectExistingVersion,
  onCreateVersion,
  enableCardList = false,
}: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // このデッキの全バージョン（デッキコード）。デッキコード欄の案内の出し分けに使う。
  const { deckcodes } = useDeckCodes(deck?.id, deckcode?.id);
  const versionCount = deckcodes?.length ?? null;

  if (!deck) {
    return (
      <>
        <div className="" onClick={onOpen}>
          {/* 枠(Card)では包まない。デッキコード未登録のときに DeckCodeCard が出す案内と
              同じ見え方にし、パネルの他の状態(デッキ画像・取得失敗)とも幅を揃える */}
          <div className="group w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6 transition-colors hover:border-primary/60 hover:bg-primary/10 active:opacity-80">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
              <LuLayoutGrid className="text-xl text-primary" />
            </div>
            <div className="font-bold text-tiny text-primary">
              使用したデッキを登録しよう
            </div>
            <div className="text-tiny text-default-400 text-center">
              この記録で使用したデッキを登録すると
              <br />
              デッキ別の対戦成績を振り返れます
            </div>
          </div>
        </div>

        {enableShowDeckModal && (
          <ShowDeckModal
            deck={deck}
            setDeck={setDeck}
            deckcode={deckcode}
            setDeckCode={setDeckCode}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            onRemove={() => {}}
            autoOpenHistory={false}
            onAutoOpenHistoryHandled={() => {}}
          />
        )}
      </>
    );
  }

  // archived_atがゼロ値(年が1)なら未アーカイブ
  const isArchived = !isZeroDate(deck.archived_at);

  return (
    <>
      <div className="" onClick={onOpen}>
        {/* デッキコード(画像・コード)と、その下に置くカードリストの間隔は
            DeckCodeCard内部の要素間(gap-2.5)と揃える */}
        <div className="flex w-full flex-col gap-2.5">
          <DeckCodeCard
            deckcode={deckcode}
            totalVersionCount={versionCount}
            onCreateVersion={isArchived ? undefined : onCreateVersion}
            onSelectExistingVersion={onSelectExistingVersion}
            isArchived={isArchived}
          />

          {enableCardList && deckcode?.code && <CardListAccordion code={deckcode.code} />}
        </div>
      </div>

      {enableShowDeckModal && (
        <ShowDeckModal
          deck={deck}
          setDeck={setDeck}
          deckcode={deckcode}
          setDeckCode={setDeckCode}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          onRemove={() => {}}
          autoOpenHistory={false}
          onAutoOpenHistoryHandled={() => {}}
        />
      )}
    </>
  );
}
