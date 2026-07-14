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
  Card,
  CardBody,
} from "@heroui/react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";

import {
  LuEllipsisVertical,
  LuExternalLink,
  LuTrash2,
  LuLayers,
  LuChartNoAxesColumn,
  LuShare2,
} from "react-icons/lu";

import RecordHero from "@app/components/organisms/Record/Hero/RecordHero";
import BoardPanel from "@app/components/organisms/Record/BoardPanel";
import IgnoreStatsFlgSetting from "@app/components/organisms/Record/IgnoreStatsFlgSetting";
import Matches from "@app/components/organisms/Match/Matches";
import UsedDeckById from "@app/components/organisms/Deck/UsedDeckById";

import DeleteRecordModal from "@app/components/organisms/Record/Modal/DeleteRecordModal";
import ShareRecordModal from "@app/components/organisms/Record/Modal/ShareRecordModal";

import { RecordGetByIdResponseType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { MatchGetResponseType } from "@app/types/match";

import { fetchMatchesByRecordId, summarizeMatches } from "@app/utils/matchStats";

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
    isOpen: isOpenForShareModal,
    onOpen: onOpenForShareModal,
    onOpenChange: onOpenChangeForShareModal,
    onClose: onCloseForShareModal,
  } = useDisclosure();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 戦績集計の有効/無効を切り替えるAPIの実行中かどうか。
  // 実行中に閉じられると、更新結果(集計対象外バナーの出現/消失)や失敗トーストを
  // 確認できないまま画面から消えてしまうため、この間は閉じる操作を受け付けない。
  const [isStatsUpdating, setIsStatsUpdating] = useState(false);

  // 戦績パネルの裏面(貢献度)の表示状態。シェア画像は画面外に別の RecordHero を
  // 描画して撮るため、画面と同じ面を撮れるよう状態はここで持ちシェア側にも渡す。
  const [showSynergy, setShowSynergy] = useState(false);
  // シェアモーダルでポスト文を組み立てるための取得済みデータ
  const [shareOfficialEvent, setShareOfficialEvent] =
    useState<OfficialEventGetByIdResponseType | null>(null);
  const [shareTonamelEvent, setShareTonamelEvent] =
    useState<TonamelEventGetByIdResponseType | null>(null);
  const [shareUnofficialEvent, setShareUnofficialEvent] =
    useState<UnofficialEventGetByIdResponseType | null>(null);
  const [shareDeck, setShareDeck] = useState<DeckGetByIdResponseType | null>(null);

  // 対戦一覧を親で一元管理し、ヒーローの戦績と対戦結果表示で共有する
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const stats = summarizeMatches(matches ?? []);

  useEffect(() => {
    let ignore = false;
    setLoadingMatches(true);
    fetchMatchesByRecordId(record.id)
      .then((data) => {
        if (!ignore) setMatches(data);
      })
      .catch((err) => {
        console.log(err);
        if (!ignore) setMatches([]);
      })
      .finally(() => {
        if (!ignore) setLoadingMatches(false);
      });
    return () => {
      ignore = true;
    };
  }, [record.id]);

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

  const startY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isStatsUpdating) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isStatsUpdating) return;
    if (startY.current === null) return;
    if (e.touches[0].clientY - startY.current > 30) {
      startY.current = null;
      onClose();
    }
  };

  // Escキーなど HeroUI 側からの閉じる要求も、集計切り替え中は無視する。
  const handleOpenChange = () => {
    if (isStatsUpdating) return;
    onOpenChange();
  };

  // シェアのデッキ画像(2枚目)をキャプチャするための実DOM参照
  const deckCardRef = useRef<HTMLDivElement>(null);

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
      />

      <Modal
        isOpen={isOpen}
        onClose={() => {}}
        onOpenChange={handleOpenChange}
        size="md"
        placement="bottom"
        hideCloseButton
        backdrop={nestedInModal ? "transparent" : "opaque"}
        isDismissable={false}
        isKeyboardDismissDisabled={isStatsUpdating}
        className="z-20 h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none overscroll-contain"
        classNames={{
          base: "sm:max-w-full lg:max-w-2xl",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          {() => (
            <>
              {/* ドロップダウン表示中の背景オーバーレイ（記録ページの3点メニューと同様のぼかし）
                  ※ HeroUI の Modal は wrapper/backdrop が z-50 固定のため、Modal の外側に
                  置くと常にモーダル本体の裏に隠れてしまう。ここでは position:relative な
                  ダイアログ本体（base）の直下に absolute で重ね、本体内でのみ完結させる。 */}
              {isDropdownOpen && (
                <div
                  className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200"
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}

              {/* スワイプ検知 */}
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className={`px-3 py-3 flex flex-col gap-1 touch-none ${
                  isStatsUpdating ? "cursor-not-allowed" : "cursor-grab"
                }`}
              >
                {/* スワイプバー */}
                <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />

                {/* 両端配置 */}
                <div className="flex items-center justify-between w-full">
                  <div>記録情報</div>

                  {/* 右側の操作: シェア(独立アイコン) + 3点メニュー */}
                  <div className="flex items-center gap-1 -translate-y-3">
                    {/* シェア: プライマリ色で強調した独立アイコン(3点メニューから分離) */}
                    <Button
                      isIconOnly
                      size="sm"
                      radius="full"
                      className="bg-primary/10 text-primary"
                      aria-label="この記録をシェアする"
                      onPress={onOpenForShareModal}
                    >
                      <LuShare2 className="text-lg" />
                    </Button>

                    {/* 3点メニュー(詳細・編集ページ / 削除) */}
                    <Dropdown
                      isOpen={isDropdownOpen}
                      onOpenChange={setIsDropdownOpen}
                      // HeroUI 側の「メニュー外押下で閉じる」を無効化する。
                      // これを有効にしたままだと、押下時にオーバーレイが先に消えてしまい、
                      // 直後のクリックが背後の要素に着弾してしまう。
                      // クローズはオーバーレイの onClick に一本化し、クリックをオーバーレイに消費させる。
                      shouldCloseOnInteractOutside={() => false}
                    >
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          className="text-default-500"
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
                              sessionStorage.setItem(
                                "reopenDeckModalDeckId",
                                activeDeckId,
                              );
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
                </div>
              </ModalHeader>

              <ModalBody className="px-1 pb-6 gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] scrollbar-none">
                {/* ヒーロー：イベント情報＋戦績(勝率リング・勝敗)＋使用デッキ＋対戦結果＋集計対象外バナー */}
                <div className="px-1">
                  <RecordHero
                    record={record}
                    setRecord={setRecord}
                    stats={stats}
                    showSynergy={showSynergy}
                    onToggleSynergy={() => setShowSynergy((prev) => !prev)}
                    matchesSlot={
                      <Matches
                        record={record}
                        matches={matches}
                        setMatches={setMatches}
                        loading={loadingMatches}
                        enableCreateMatchModalButton={false}
                        enableUpdateMatchModalButton={false}
                        flat={true}
                      />
                    }
                  />
                </div>

                {/* ボード：デッキコード・戦績集計を1枚のカードにまとめる */}
                <div className="px-1">
                  <Card shadow="sm" className="w-full overflow-hidden">
                    <CardBody className="p-0">
                      <BoardPanel icon={<LuLayers />} label="デッキコード">
                        <div ref={deckCardRef}>
                          <UsedDeckById
                            record={record}
                            setRecord={setRecord}
                            enableShowDeckModal={false}
                            enableUpdateUsedDeckModal={false}
                            compact={true}
                          />
                        </div>
                      </BoardPanel>

                      <BoardPanel icon={<LuChartNoAxesColumn />} label="戦績集計">
                        <IgnoreStatsFlgSetting
                          record={record}
                          setRecord={setRecord}
                          flat={true}
                          onUpdatingChange={setIsStatsUpdating}
                        />
                      </BoardPanel>
                    </CardBody>
                  </Card>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
