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
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
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

async function fetchUnofficialEventForShare(
  id: string,
): Promise<UnofficialEventGetByIdResponseType> {
  const res = await fetch(`/api/unofficial_events/${id}`, {
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
  // 戦績パネルで貢献度(裏面)を表示中か。シェア画像に同じ面を写すため、そのまま中継する
  showSynergy?: boolean;
  deckCardRef: RefObject<HTMLDivElement | null>;
};

export default function RecordActionsFloating({
  record,
  setRecord,
  matches,
  stats,
  showSynergy,
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
  const [shareUnofficialEvent, setShareUnofficialEvent] =
    useState<UnofficialEventGetByIdResponseType | null>(null);
  const [shareDeck, setShareDeck] = useState<DeckGetByIdResponseType | null>(null);

  useEffect(() => {
    if (!record) return;

    let officialEvent: OfficialEventGetByIdResponseType | null = null;
    let tonamelEvent: TonamelEventGetByIdResponseType | null = null;
    let unofficialEvent: UnofficialEventGetByIdResponseType | null = null;
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
    } else if (record.unofficial_event_id !== "") {
      tasks.push(
        fetchUnofficialEventForShare(record.unofficial_event_id)
          .then((d) => {
            unofficialEvent = d;
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
      setShareUnofficialEvent(unofficialEvent);
      setShareDeck(deck);
    });
  }, [record]);

  return (
    <>
      <ShareRecordModal
        record={record}
        setRecord={setRecord}
        stats={stats}
        showSynergy={showSynergy}
        matches={matches}
        officialEvent={shareOfficialEvent}
        tonamelEvent={shareTonamelEvent}
        unofficialEvent={shareUnofficialEvent}
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

      {/* 右下のフローティング操作群。シェアは独立したフローティングに分離し、
          3点メニューには削除など低頻度の操作を残す。
          bottom-21 は下部ナビ(h-17)の上に 16px の間隔を空ける値。lg以上は下部ナビが
          消えるため、従来どおり画面下から 80px に戻す。 */}
      <div className="fixed z-30 bottom-21 lg:bottom-20 right-3 flex flex-col items-center gap-3">
        {/* シェア用フローティング。メニューは上向きに開くため、展開中は
            重なりを避けてシェアボタンを隠す。 */}
        {!isDropdownOpen && (
          <Button
            isIconOnly
            aria-label="この記録をシェアする"
            radius="full"
            size="lg"
            color="primary"
            className="shadow-lg active:scale-95 transition-all duration-200"
            onPress={onOpenForShareModal}
          >
            <LuShare2 className="text-xl" />
          </Button>
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
              color="default"
              className="shadow-lg active:scale-95 transition-all duration-200"
            >
              <LuEllipsisVertical className="text-xl" />
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label="記録の操作">
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
    </>
  );
}
