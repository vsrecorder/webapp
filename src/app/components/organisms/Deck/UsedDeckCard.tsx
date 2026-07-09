"use client";

//import { useState } from "react";

import { SetStateAction, Dispatch, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";

import { spriteScaleClass } from "@app/utils/sprite";
//import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuLayers } from "react-icons/lu";
import { LuCalendar } from "react-icons/lu";
import { LuLayoutGrid } from "react-icons/lu";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import ShowDeckModal from "@app/components/organisms/Deck/Modal/ShowDeckModal";

import { useDeckCodes, getDeckCodeVersionNumber } from "@app/hooks/useDeckCodes";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

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
};

export default function UsedDeckCard({
  deck,
  setDeck,
  deckcode,
  setDeckCode,
  enableShowDeckModal,
  onSelectExistingVersion,
  onCreateVersion,
}: Props) {
  //const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(deckData);
  //const [deckcode, setDeckCode] = useState<DeckCodeType | null>(deckcodeData);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // このデッキの全バージョン（デッキコード）。件数バッジと通し番号の算出に使う。
  const { deckcodes } = useDeckCodes(deck?.id, deckcode?.id);
  const versionCount = deckcodes?.length ?? null;
  // 実際に使用したdeckcode自体の通し番号（総バージョン数とは異なる）
  const versionNumber = getDeckCodeVersionNumber(deckcodes, deckcode?.id);

  // バッジタップ時、デッキ詳細を開くと同時にバージョン履歴も自動で開く
  const [openHistoryOnShow, setOpenHistoryOnShow] = useState(false);

  if (!deck) {
    return (
      <>
        <div className="" onClick={onOpen}>
          <Card className="pt-3 w-full">
            <CardBody className="px-3 py-2">
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
            </CardBody>
          </Card>
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

  const date = new Date(deck.created_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <>
      <div className="" onClick={onOpen}>
        <Card className="pt-3 w-full">
          <CardHeader className="pt-0 pb-0 px-3">
            <div className="flex flex-col gap-1 w-full">
              {/* 両端配置 */}
              <div className="flex items-start justify-between w-full">
                {/* 左側 */}

                <div className="flex items-center gap-0 shrink-0">
                  {deck.pokemon_sprites[0] ? (
                    <Image
                      alt={deck.pokemon_sprites[0].id}
                      src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[0].id.replace(/^0+(?!$)/, "")}.png`}
                      className={`w-11 h-11 object-contain ${spriteScaleClass(deck.pokemon_sprites[0].id)} origin-bottom`}
                    />
                  ) : (
                    <Image
                      alt="unknown"
                      src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                      className="w-11 h-11 object-contain scale-150 origin-bottom"
                    />
                  )}

                  {deck.pokemon_sprites[1] ? (
                    <Image
                      alt={deck.pokemon_sprites[1].id}
                      src={`https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/${deck.pokemon_sprites[1].id.replace(/^0+(?!$)/, "")}.png`}
                      className={`w-11 h-11 object-contain ${spriteScaleClass(deck.pokemon_sprites[1].id)} origin-bottom`}
                    />
                  ) : (
                    <Image
                      alt="unknown"
                      src="https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png"
                      className="w-11 h-11 object-contain scale-150 origin-bottom"
                    />
                  )}
                </div>

                {/* 右側：登録日＋バージョン件数バッジをひとかたまりに */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-tiny text-default-400">
                    <LuCalendar className="text-xs" />
                    {date}
                  </div>

                  {versionCount !== null && versionCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenHistoryOnShow(true);
                        onOpen();
                      }}
                      className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-tiny font-bold active:opacity-70"
                    >
                      <LuLayers className="text-sm" />
                      バージョンの数： {versionCount}
                    </button>
                  )}
                </div>
              </div>

              <div className="font-bold text-large truncate w-full min-w-0">
                {deck.name}
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-3 py-2">
            <DeckCodeCard
              deckcode={deckcode}
              versionNumber={versionNumber}
              totalVersionCount={versionCount}
              onCreateVersion={onCreateVersion}
              onSelectExistingVersion={onSelectExistingVersion}
            />
          </CardBody>
        </Card>
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
          autoOpenHistory={openHistoryOnShow}
          onAutoOpenHistoryHandled={() => setOpenHistoryOnShow(false)}
        />
      )}
    </>
  );
}
