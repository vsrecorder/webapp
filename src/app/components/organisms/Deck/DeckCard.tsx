"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Image } from "@heroui/react";

import { spriteScaleClass } from "@app/utils/sprite";
//import { Chip } from "@heroui/react";

import { useDisclosure } from "@heroui/react";

import { LuLayers } from "react-icons/lu";
import { LuCalendar } from "react-icons/lu";

import DeckCodeCard from "@app/components/organisms/Deck/DeckCodeCard";
import ShowDeckModal from "@app/components/organisms/Deck/Modal/ShowDeckModal";

import { useDeckCodes, getDeckCodeVersionNumber } from "@app/hooks/useDeckCodes";

import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";

type Props = {
  deckData: DeckGetByIdResponseType | null;
  deckcodeData: DeckCodeType | null;
  onRemove: (id: string) => void;
  enableShowDeckModal: boolean;
};

export default function DeckCard({
  deckData,
  deckcodeData,
  onRemove,
  enableShowDeckModal,
}: Props) {
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(deckData);
  const [deckcode, setDeckCode] = useState<DeckCodeType | null>(deckcodeData);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // このデッキの全バージョン（デッキコード）。件数バッジと通し番号の算出に使う。
  const { deckcodes } = useDeckCodes(deck?.id, deckcode?.id);
  const versionCount = deckcodes?.length ?? null;
  const versionNumber = getDeckCodeVersionNumber(deckcodes, deckcode?.id);

  // バッジタップ時、デッキ詳細を開くと同時にバージョン履歴も自動で開く
  const [openHistoryOnShow, setOpenHistoryOnShow] = useState(false);

  // 記録の詳細ページから戻ってきた際、対象デッキならデッキモーダルを再開する。
  // 記録一覧モーダルも再開する意図は、React state ではなく sessionStorage で
  // 伝える（StrictMode の二重マウントで state 同期が壊れるのを避けるため）。
  useEffect(() => {
    if (!enableShowDeckModal || !deck) return;
    const pendingDeckId = sessionStorage.getItem("reopenDeckModalDeckId");
    if (pendingDeckId && pendingDeckId === deck.id) {
      sessionStorage.removeItem("reopenDeckModalDeckId");
      // ShowDeckModal が開いたときに記録一覧モーダルも開くための意図フラグ
      sessionStorage.setItem("reopenRecordsModalForDeckId", deck.id);
      onOpen();
    }
    // deck.id を依存に含め、対象デッキのカードでのみ一度だけ実行する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableShowDeckModal, deck?.id]);

  if (!deck) {
    return (
      <>
        <div className="" onClick={onOpen}>
          <Card className="pt-3 w-full">
            <CardHeader className="pt-0 pb-0 px-3">
              <div className="flex flex-col gap-1 w-full">
                {/* 両端配置 */}
                <div className="flex items-center justify-between w-full">
                  {/* 左側 */}
                  <div className="font-bold text-large truncate w-full min-w-0">
                    <>なし</>
                  </div>

                  {/* 右側：登録日 */}
                  <div className="flex items-center gap-1 text-tiny text-default-400 shrink-0">
                    <LuCalendar className="text-xs" />
                    なし
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody className="px-3 py-2">
              <DeckCodeCard deckcode={deckcode} versionNumber={null} />
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
            onRemove={onRemove}
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
              onCreateVersion={onOpen}
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
          onRemove={onRemove}
          autoOpenHistory={openHistoryOnShow}
          onAutoOpenHistoryHandled={() => setOpenHistoryOnShow(false)}
        />
      )}
    </>
  );
}
