"use client";

import { RefObject, Dispatch, SetStateAction, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { Button, useDisclosure } from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

import { LuEllipsisVertical, LuTrash2, LuShare2 } from "react-icons/lu";

import DeleteRecordModal from "@app/components/organisms/Record/Modal/DeleteRecordModal";
import ShareRecordModal from "@app/components/organisms/Record/Modal/ShareRecordModal";

import { RecordGetByIdResponseType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { MatchGetResponseType } from "@app/types/match";

import { MatchStats } from "@app/utils/matchStats";

// シェアのポスト文組み立てに必要なイベント・デッキ情報の取得

async function fetchOfficialEventForShare(
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

async function fetchTonamelEventForShare(
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

async function fetchDeckForShare(id: string): Promise<DeckGetByIdResponseType> {
  const res = await fetch(`/api/decks/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  // ヒーローの戦績と共有する対戦一覧・戦績サマリー(親で一元管理)
  matches: MatchGetResponseType[] | null;
  stats: MatchStats;
  deckCardRef: RefObject<HTMLDivElement | null>;
};

export default function RecordActionsFloating({
  record,
  setRecord,
  matches,
  stats,
  deckCardRef,
}: Props) {
  const router = useRouter();

  const {
    isOpen: isOpenForDeleteRecordModal,
    onOpen: onOpenForDeleteRecordModal,
    onOpenChange: onOpenChangeForDeleteRecordModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForShareModal,
    onOpen: onOpenForShareModal,
    onOpenChange: onOpenChangeForShareModal,
    onClose: onCloseForShareModal,
  } = useDisclosure();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // シェアモーダルでポスト文を組み立てるための取得済みデータ
  const [shareOfficialEvent, setShareOfficialEvent] =
    useState<OfficialEventGetByIdResponseType | null>(null);
  const [shareTonamelEvent, setShareTonamelEvent] =
    useState<TonamelEventGetByIdResponseType | null>(null);
  const [shareDeck, setShareDeck] = useState<DeckGetByIdResponseType | null>(null);

  useEffect(() => {
    if (!record) return;

    let officialEvent: OfficialEventGetByIdResponseType | null = null;
    let tonamelEvent: TonamelEventGetByIdResponseType | null = null;
    let deck: DeckGetByIdResponseType | null = null;

    const tasks: Promise<void>[] = [];

    if (record.official_event_id !== 0) {
      tasks.push(
        fetchOfficialEventForShare(record.official_event_id)
          .then((d) => {
            officialEvent = d;
          })
          .catch(() => {}),
      );
    } else if (record.tonamel_event_id !== "") {
      tasks.push(
        fetchTonamelEventForShare(record.tonamel_event_id)
          .then((d) => {
            tonamelEvent = d;
          })
          .catch(() => {}),
      );
    }

    if (record.deck_id) {
      tasks.push(
        fetchDeckForShare(record.deck_id)
          .then((d) => {
            deck = d;
          })
          .catch(() => {}),
      );
    }

    Promise.all(tasks).then(() => {
      setShareOfficialEvent(officialEvent);
      setShareTonamelEvent(tonamelEvent);
      setShareDeck(deck);
    });
  }, [record]);

  return (
    <>
      <ShareRecordModal
        record={record}
        setRecord={setRecord}
        stats={stats}
        matches={matches}
        officialEvent={shareOfficialEvent}
        tonamelEvent={shareTonamelEvent}
        deck={shareDeck}
        deckCardRef={deckCardRef}
        isOpen={isOpenForShareModal}
        onOpenChange={onOpenChangeForShareModal}
        onClose={onCloseForShareModal}
      />

      <DeleteRecordModal
        record={record}
        setRecord={setRecord}
        isOpen={isOpenForDeleteRecordModal}
        onOpenChange={onOpenChangeForDeleteRecordModal}
        onDeleted={() => router.push("/records")}
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
            key="share"
            startContent={<LuShare2 />}
            onPress={onOpenForShareModal}
          >
            この記録をシェアする
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
