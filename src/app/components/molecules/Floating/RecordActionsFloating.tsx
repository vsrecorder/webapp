"use client";

import { RefObject, Dispatch, SetStateAction, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Button, useDisclosure } from "@heroui/react";
import { addToast, closeToast } from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

import { LuEllipsisVertical, LuImageDown, LuTrash2 } from "react-icons/lu";
import { RiTwitterXLine } from "react-icons/ri";

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

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  matchCardRef: RefObject<HTMLDivElement | null>;
  deckCardRef: RefObject<HTMLDivElement | null>;
};

export default function RecordActionsFloating({
  record,
  setRecord,
  matchCardRef,
  deckCardRef,
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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
        onDeleted={() => router.push("/records")}
      />

      <ImageSaveGuideModal
        isOpen={isOpenForImageSaveGuideModal}
        onOpenChange={onOpenChangeForImageSaveGuideModal}
        imageDataUrl={imageDataUrlForSaveGuide}
      />

      {/* ドロップダウン表示中の背景オーバーレイ */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-25 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      <Dropdown
        placement="top-end"
        isOpen={isDropdownOpen}
        onOpenChange={setIsDropdownOpen}
        // HeroUI 側の「メニュー外押下で閉じる」を無効化する。
        // これを有効にしたままだと、押下時にオーバーレイが先に消えてしまい、
        // 直後のクリックが背後のデッキカードに着弾してモーダルが開いてしまう。
        // クローズはオーバーレイの onClick に一本化し、クリックをオーバーレイに消費させる。
        shouldCloseOnInteractOutside={() => false}
      >
        <DropdownTrigger>
          <Button
            isIconOnly
            aria-label="操作メニューを開く"
            radius="full"
            size="lg"
            color="primary"
            className="fixed z-30 bottom-20 right-3 shadow-lg active:scale-95 transition-all duration-200"
          >
            <LuEllipsisVertical className="text-xl" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="記録の操作">
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
    </>
  );
}
