"use client";

import { useRef, useState, useEffect } from "react";

import { SetStateAction, Dispatch } from "react";

import { useRouter } from "next/navigation";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Button,
} from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

import {
  LuImageDown,
  LuEllipsisVertical,
  LuExternalLink,
  LuTrash2,
} from "react-icons/lu";
import { RiTwitterXLine } from "react-icons/ri";

import OfficialEventInfo from "@app/components/organisms/Record/OfficialEventInfo";
import TonamelEventInfo from "@app/components/organisms/Record/TonamelEventInfo";
import UnofficialEventInfo from "@app/components/organisms/Record/UnofficialEventInfo";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";

import DeleteRecordModal from "@app/components/organisms/Record/Modal/DeleteRecordModal";
import ImageSaveGuideModal from "@app/components/molecules/Image/ImageSaveGuideModal";

import { RecordGetByIdResponseType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { MatchGetResponseType } from "@app/types/match";

import { captureThemedPng } from "@app/utils/captureImage";
import { saveGeneratedImage } from "@app/utils/saveImage";
import { isIOS } from "@app/utils/platform";

// ツイートURL生成ヘルパー

async function fetchOfficialEventForTweet(
  id: number,
): Promise<OfficialEventGetByIdResponseType> {
  const res = await fetch(`/api/official_events/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchTonamelEventForTweet(
  id: string,
): Promise<TonamelEventGetByIdResponseType> {
  const res = await fetch(`/api/tonamel_events/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchDeckForTweet(id: string): Promise<DeckGetByIdResponseType> {
  const res = await fetch(`/api/decks/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchMatchesForTweet(record_id: string): Promise<MatchGetResponseType[]> {
  const res = await fetch(`/api/records/${record_id}/matches`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function buildTweetHref(
  officialEvent: OfficialEventGetByIdResponseType | null,
  tonamelEvent: TonamelEventGetByIdResponseType | null,
  deck: DeckGetByIdResponseType | null,
  matches: MatchGetResponseType[] | null,
): string {
  let results = "";
  if (matches && matches.length !== 0) {
    results = "\n対戦結果\n";
    matches.forEach((match) => {
      const victory = match.victory_flg ? "⭕" : "❌";
      const go_first =
        match.default_victory_flg || match.default_defeat_flg
          ? "　"
          : match.games[0].go_first
            ? "先"
            : "後";
      const opponents_deck_info = match.default_victory_flg
        ? "不戦勝"
        : match.default_defeat_flg
          ? "不戦敗"
          : match.opponents_deck_info;
      results += ` ${victory} ${go_first} ${opponents_deck_info}\n`;
    });
  }

  let encoded = "";
  if (officialEvent) {
    const title = officialEvent.title
      .replace(/【.*?】ポケモンカードジム　/g, "")
      .replace(/【.*?】エクストラバトルの日/g, "エクストラバトルの日")
      .replace(/【.*?】ポケモンカードゲーム　/g, "")
      .replace(/ポケモンカードゲーム /g, "")
      .replace(/（オープンリーグ）/g, "")
      .replace(/（マスターリーグ）/g, "")
      .replace(/（シニアリーグ）/g, "")
      .replace(/（ジュニアリーグ）/g, "")
      .replace(/（スタンダード）/g, "")
      .replace(/（.*?）/g, "");
    const shopName = officialEvent.shop_name || officialEvent.venue;
    encoded = encodeURIComponent(`${title}\n${shopName}\n${results}\n`);
  } else if (tonamelEvent) {
    encoded = encodeURIComponent(`${tonamelEvent.title}\n${results}\n`);
  }

  if (deck && deck.name !== "") {
    encoded += encodeURIComponent(`使用デッキ：${deck.name}\n`);
  }

  const hashtag = encodeURIComponent("バトレコ");
  return `https://twitter.com/intent/tweet?text=${encoded}&via=vsrecorder_mobi&hashtags=${hashtag}`;
}

// コンポーネント

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
  // 親モーダル（デッキの記録一覧モーダル）の中で開く場合 true。
  // 親モーダルのバックドロップと重なって暗さが累積するのを防ぐため、
  // このモーダル側のバックドロップを透明にする。
  nestedInModal?: boolean;
};

export default function DisplayRecordModal({
  record,
  setRecord,
  isOpen,
  onOpenChange,
  onClose,
  nestedInModal = false,
}: Props) {
  const router = useRouter();

  const {
    isOpen: isOpenForDeleteRecordModal,
    onOpen: onOpenForDeleteRecordModal,
    onOpenChange: onOpenChangeForDeleteRecordModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForImageSaveGuideModal,
    onOpen: onOpenForImageSaveGuideModal,
    onOpenChange: onOpenChangeForImageSaveGuideModal,
  } = useDisclosure();
  const [imageDataUrlForSaveGuide, setImageDataUrlForSaveGuide] = useState<string | null>(
    null,
  );

  const [tweetHref, setTweetHref] = useState<string>("");

  useEffect(() => {
    if (!record) return;

    let officialEvent: OfficialEventGetByIdResponseType | null = null;
    let tonamelEvent: TonamelEventGetByIdResponseType | null = null;
    let deck: DeckGetByIdResponseType | null = null;
    let matches: MatchGetResponseType[] | null = null;

    const tasks: Promise<void>[] = [];

    if (record.official_event_id !== 0) {
      tasks.push(
        fetchOfficialEventForTweet(record.official_event_id)
          .then((d) => {
            officialEvent = d;
          })
          .catch(() => {}),
      );
    } else if (record.tonamel_event_id !== "") {
      tasks.push(
        fetchTonamelEventForTweet(record.tonamel_event_id)
          .then((d) => {
            tonamelEvent = d;
          })
          .catch(() => {}),
      );
    }

    if (record.deck_id) {
      tasks.push(
        fetchDeckForTweet(record.deck_id)
          .then((d) => {
            deck = d;
          })
          .catch(() => {}),
      );
    }

    tasks.push(
      fetchMatchesForTweet(record.id)
        .then((d) => {
          matches = d;
        })
        .catch(() => {}),
    );

    Promise.all(tasks).then(() => {
      setTweetHref(buildTweetHref(officialEvent, tonamelEvent, deck, matches));
    });
  }, [record]);

  const startY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    if (e.touches[0].clientY - startY.current > 30) {
      startY.current = null;
      onClose();
    }
  };

  const matchCardRef = useRef<HTMLDivElement>(null);

  const handleSavingEventCardImage = async () => {
    const toastId = addToast({
      title: "画像をダウンロード中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    if (!matchCardRef.current) {
      if (toastId) closeToast(toastId);
      addToast({
        title: "画像のダウンロードに失敗",
        description: "画像のダウンロードに失敗しました",
        color: "danger",
        timeout: 5000,
      });
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await captureThemedPng(matchCardRef.current);
      if (!isIOS()) await saveGeneratedImage(dataUrl, `${record.id}_${Date.now()}.png`);
    } catch (e) {
      console.log(e);
      if (toastId) closeToast(toastId);
      addToast({
        title: "画像のダウンロードに失敗",
        description: "画像のダウンロードに失敗しました",
        color: "danger",
        timeout: 5000,
      });
      return;
    }

    if (toastId) closeToast(toastId);

    // iOSはWeb Share APIでも「画像を保存」が出ないことがあるため、
    // 長押し保存できるプレビューモーダルを表示する
    if (isIOS()) {
      setImageDataUrlForSaveGuide(dataUrl);
      onOpenForImageSaveGuideModal();
      return;
    }

    addToast({
      title: "画像のダウンロードが完了",
      description: "画像をダウンロードしました",
      color: "success",
      timeout: 3000,
    });
  };

  const deckCardRef = useRef<HTMLDivElement>(null);

  const handleSavingDeckCardImage = async () => {
    const toastId = addToast({
      title: "画像をダウンロード中",
      description: "しばらくお待ちください",
      color: "default",
      promise: new Promise(() => {}),
    });

    if (!deckCardRef.current) {
      if (toastId) closeToast(toastId);
      addToast({
        title: "画像のダウンロードに失敗",
        description: "画像のダウンロードに失敗しました",
        color: "danger",
        timeout: 5000,
      });
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await captureThemedPng(deckCardRef.current);
      if (!isIOS())
        await saveGeneratedImage(
          dataUrl,
          `${record.deck_id}_${record.deck_code_id}_${Date.now()}.png`,
        );
    } catch {
      if (toastId) closeToast(toastId);
      addToast({
        title: "画像のダウンロードに失敗",
        description: "画像のダウンロードに失敗しました",
        color: "danger",
        timeout: 5000,
      });
      return;
    }

    if (toastId) closeToast(toastId);

    if (isIOS()) {
      setImageDataUrlForSaveGuide(dataUrl);
      onOpenForImageSaveGuideModal();
      return;
    }

    addToast({
      title: "画像のダウンロードが完了",
      description: "画像をダウンロードしました",
      color: "success",
      timeout: 3000,
    });
  };

  return (
    <>
      <DeleteRecordModal
        record={record}
        setRecord={setRecord}
        isOpen={isOpenForDeleteRecordModal}
        onOpenChange={onOpenChangeForDeleteRecordModal}
      />

      <ImageSaveGuideModal
        isOpen={isOpenForImageSaveGuideModal}
        onOpenChange={onOpenChangeForImageSaveGuideModal}
        imageDataUrl={imageDataUrlForSaveGuide}
      />

      <Modal
        isOpen={isOpen}
        onClose={() => {}}
        onOpenChange={onOpenChange}
        size="md"
        placement="bottom"
        hideCloseButton
        backdrop={nestedInModal ? "transparent" : "opaque"}
        isDismissable={false}
        className="z-20 h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none overscroll-contain"
        classNames={{
          base: "sm:max-w-full lg:max-w-2xl",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              {/* スワイプ検知 */}
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="px-3 py-3 flex flex-col gap-1 cursor-grab touch-none"
              >
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

                {/* 両端配置 */}
                <div className="flex items-center justiry-center justify-between w-full">
                  <div>記録情報</div>

                  {/* 3点メニュー */}
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        className="text-default-500 -translate-y-3"
                        aria-label="メニューを開く"
                      >
                        <LuEllipsisVertical className="text-xl" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="記録の操作">
                      <DropdownItem
                        key="detail"
                        startContent={<LuExternalLink />}
                        onPress={() => {
                          const eventType =
                            record.official_event_id !== 0
                              ? "official"
                              : record.tonamel_event_id !== ""
                                ? "tonamel"
                                : "unofficial";
                          sessionStorage.setItem("reopenModalRecordId", record.id);
                          sessionStorage.setItem("reopenModalEventType", eventType);
                          // デッキの記録一覧モーダル内から開いた場合は、戻り遷移で
                          // デッキモーダル＋記録一覧モーダルを再開するため deck.id も保存する。
                          const activeDeckId = sessionStorage.getItem(
                            "activeDeckRecordsModalDeckId",
                          );
                          if (activeDeckId) {
                            sessionStorage.setItem("reopenDeckModalDeckId", activeDeckId);
                            // アーカイブ状態も引き継ぐ（戻り時のタブ切り替え用）
                            const activeArchived = sessionStorage.getItem(
                              "activeDeckRecordsModalArchived",
                            );
                            if (activeArchived) {
                              sessionStorage.setItem(
                                "reopenDeckModalArchived",
                                activeArchived,
                              );
                            }
                          }
                          router.push(`/records/${record.id}`);
                        }}
                      >
                        詳細・編集ページを開く
                      </DropdownItem>
                      <DropdownItem
                        key="save-event-image"
                        startContent={<LuImageDown />}
                        onPress={handleSavingEventCardImage}
                      >
                        対戦結果の画像を保存
                      </DropdownItem>
                      <DropdownItem
                        key="save-deck-image"
                        startContent={<LuImageDown />}
                        onPress={handleSavingDeckCardImage}
                      >
                        使用したデッキの画像を保存
                      </DropdownItem>
                      <DropdownItem
                        key="tweet"
                        startContent={<RiTwitterXLine />}
                        isDisabled={!tweetHref}
                        onPress={() => window.open(tweetHref, "_blank")}
                      >
                        この対戦結果をポストする
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        startContent={<LuTrash2 />}
                        color="danger"
                        className="text-danger"
                        onPress={() => onOpenForDeleteRecordModal()}
                      >
                        この記録を削除する
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </ModalHeader>

              <ModalBody className="px-1 pb-6 gap-9 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
                <div className="px-1 flex flex-col gap-3">
                  <div className="pb-0 flex items-center justify-center">
                    <div className="font-bold underline">参加したイベント</div>
                  </div>

                  {record.official_event_id !== 0 ? (
                    <OfficialEventInfo
                      record={record}
                      setRecord={setRecord}
                      enableEditTCGMeisterURL={false}
                    />
                  ) : record.tonamel_event_id !== "" ? (
                    <TonamelEventInfo record={record} />
                  ) : record.unofficial_event_id !== "" ? (
                    <UnofficialEventInfo record={record} />
                  ) : (
                    <></>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="pb-0 flex items-center justify-center">
                    <div className="font-bold underline">対戦結果</div>
                  </div>
                  <div className="px-0.5 flex flex-col gap-3">
                    <Matches
                      record={record}
                      enableCreateMatchModalButton={false}
                      enableUpdateMatchModalButton={false}
                      matchCardRef={matchCardRef}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="pb-0 flex items-center justify-center">
                    <div className="font-bold underline">使用したデッキ</div>
                  </div>

                  <div ref={deckCardRef} className="p-1">
                    <UsedDeckById
                      record={record}
                      setRecord={setRecord}
                      enableShowDeckModal={false}
                      enableUpdateUsedDeckModal={false}
                    />
                  </div>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
