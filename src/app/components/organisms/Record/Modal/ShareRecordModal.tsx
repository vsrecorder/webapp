"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction, RefObject } from "react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Switch,
  Textarea,
  Card,
  CardBody,
  addToast,
} from "@heroui/react";

import { LuShare2, LuImageDown, LuSwords } from "react-icons/lu";

import RecordHero from "@app/components/organisms/Record/Hero/RecordHero";
import Matches from "@app/components/organisms/Match/Matches";
import ImageSaveGuideModal from "@app/components/molecules/Image/ImageSaveGuideModal";

import { captureThemedPng } from "@app/utils/captureImage";
import { shareRecord, saveGeneratedImage, saveImages } from "@app/utils/saveImage";
import { isIOS } from "@app/utils/platform";

import { buildRecordPostText, formatEventDateLabel } from "@app/utils/recordPostText";

import { RecordGetByIdResponseType } from "@app/types/record";
import { MatchGetResponseType } from "@app/types/match";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { MatchStats } from "@app/utils/matchStats";

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  stats: MatchStats;
  matches: MatchGetResponseType[] | null;
  officialEvent: OfficialEventGetByIdResponseType | null;
  tonamelEvent: TonamelEventGetByIdResponseType | null;
  deck: DeckGetByIdResponseType | null;
  // ボードの「デッキコード」パネルの実DOM。デッキ画像(2枚目)のキャプチャに使う。
  deckCardRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
};

// 画面外の対戦一覧では並び替え等の更新は起きないため、setMatches は何もしない。
const noopSetMatches: Dispatch<SetStateAction<MatchGetResponseType[] | null>> = () => {};

/*
 * 記録のシェア用モーダル。
 * 画面外に「戦績サマリー(推移は除外)＋対戦結果」をレンダリングして1枚目の画像を生成し、
 * 「使用デッキも一緒にシェア」ONのときはデッキコードパネルを2枚目として追加する。
 * 生成した画像をポスト文とともに Web Share API で共有する。
 */
export default function ShareRecordModal({
  record,
  setRecord,
  stats,
  matches,
  officialEvent,
  tonamelEvent,
  deck,
  deckCardRef,
  isOpen,
  onOpenChange,
  onClose,
}: Props) {
  const shareContentRef = useRef<HTMLDivElement>(null);
  const [includeDeck, setIncludeDeck] = useState(false);
  // iOSは「テキスト＋複数画像」の共有だとXが共有シートに出ず、複数画像の写真保存も
  // 不安定なため、iOSではデッキ画像(2枚目)の追加を無効化し、保存は長押し保存に誘導する。
  const [ios, setIos] = useState(false);
  // 長押し保存モーダルに表示する画像。null のときは非表示。
  const [saveGuideUrl, setSaveGuideUrl] = useState<string | null>(null);
  useEffect(() => {
    setIos(isIOS());
  }, []);
  // ポスト文に含める要素(対戦結果・使用デッキ)
  const [includePostMatches, setIncludePostMatches] = useState(true);
  const [includePostDeck, setIncludePostDeck] = useState(true);
  // 実行中の処理種別。ボタンごとに正しくローディング表示を出し分ける
  const [busy, setBusy] = useState<null | "share" | "save">(null);
  const [text, setText] = useState("");

  // 取得済みデータ・オプションが変わったらポスト文を組み立て直す
  // (この時点でユーザーの手編集は上書きされる)
  useEffect(() => {
    const dateLabel = formatEventDateLabel(record.event_date, record.created_at);
    setText(
      buildRecordPostText(dateLabel, officialEvent, tonamelEvent, deck, matches, {
        includeMatches: includePostMatches,
        includeDeck: includePostDeck,
      }) + "\n#バトレコ",
    );
  }, [
    record.event_date,
    record.created_at,
    officialEvent,
    tonamelEvent,
    deck,
    matches,
    includePostMatches,
    includePostDeck,
  ]);

  // 上部バーのフリックでモーダルを閉じる(記録情報モーダルと同じ挙動)
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

  const captureImages = async () => {
    const images: { dataUrl: string; filename: string }[] = [];
    if (shareContentRef.current) {
      const img = await captureThemedPng(shareContentRef.current);
      images.push({ dataUrl: img, filename: `${record.id}_result_${Date.now()}.png` });
    }
    if (includeDeck && !ios && deckCardRef.current) {
      const img = await captureThemedPng(deckCardRef.current);
      images.push({ dataUrl: img, filename: `${record.id}_deck_${Date.now()}.png` });
    }
    return images;
  };

  const handleShare = async () => {
    setBusy("share");
    try {
      const images = await captureImages();
      if (images.length === 0) return;

      const result = await shareRecord(images, text);
      if (result === "unsupported") {
        // 共有非対応の環境では画像を保存にフォールバック
        await saveGeneratedImage(images[0].dataUrl, images[0].filename);
        addToast({
          title: "共有に非対応のため画像を保存しました",
          description: "ポスト文はコピーしてご利用ください",
          color: "warning",
          timeout: 5000,
        });
      } else if (result === "failed") {
        addToast({ title: "共有に失敗しました", color: "danger", timeout: 5000 });
      }
    } catch (e) {
      console.error(e);
      addToast({ title: "共有に失敗しました", color: "danger", timeout: 5000 });
    } finally {
      setBusy(null);
    }
  };

  const handleSaveOnly = async () => {
    setBusy("save");
    try {
      const images = await captureImages();
      if (images.length === 0) return;
      if (ios) {
        // iOSは共有シートの「写真に保存」や<a download>が効かないことがあるため、
        // 画像を表示して長押しで「"写真"に保存」してもらう。
        // iOSではデッキ画像を含めないため、対象は常に1枚。
        setSaveGuideUrl(images[0].dataUrl);
      } else {
        await saveImages(images);
      }
    } catch (e) {
      console.error(e);
      addToast({ title: "画像の保存に失敗しました", color: "danger", timeout: 5000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="bottom"
        hideCloseButton
        isDismissable={false}
        scrollBehavior="inside"
        className="rounded-b-none sm:max-w-full lg:max-w-lg"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="flex cursor-grab touch-none flex-col gap-1 px-4 pb-2 pt-3"
              >
                <div className="mx-auto mb-1 h-1 w-32 rounded-full bg-default-300" />
                <div className="flex items-center gap-2">
                  <LuShare2 className="text-primary" />
                  シェア
                </div>
              </ModalHeader>
              <ModalBody className="gap-4 px-4 pb-6">
                <p className="text-tiny text-default-500">
                  この記録の戦績と対戦結果を画像にして、下のポスト文と一緒にシェアします。
                </p>

                {/* 使用デッキがある場合のみ、2枚目追加のトグルを出す。
                    iOSは複数画像だとXが共有シートに出ない/保存が不安定なため出さない。 */}
                {record.deck_id && !ios && (
                  <div className="flex items-center gap-3 rounded-xl border border-divider bg-content2 px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                      🎴
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">使用デッキも一緒にシェア</div>
                      <div className="text-[11px] text-default-400">
                        デッキ画像を2枚目として追加します
                      </div>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={includeDeck}
                      onValueChange={setIncludeDeck}
                      aria-label="使用デッキも一緒にシェア"
                    />
                  </div>
                )}

                {/* ポスト文に含める要素の切り替え */}
                <div className="flex flex-col rounded-xl border border-divider bg-content2 px-3">
                  <div className="flex items-center gap-2 py-2.5">
                    <span className="flex-1 text-sm">対戦結果をポストに含める</span>
                    <Switch
                      size="sm"
                      isSelected={includePostMatches}
                      onValueChange={setIncludePostMatches}
                      aria-label="対戦結果をポストに含める"
                    />
                  </div>
                  {record.deck_id && (
                    <>
                      <div className="h-px bg-divider" />
                      <div className="flex items-center gap-2 py-2.5">
                        <span className="flex-1 text-sm">使用デッキをポストに含める</span>
                        <Switch
                          size="sm"
                          isSelected={includePostDeck}
                          onValueChange={setIncludePostDeck}
                          aria-label="使用デッキをポストに含める"
                        />
                      </div>
                    </>
                  )}
                </div>

                <Textarea
                  label="ポスト文"
                  value={text}
                  onValueChange={setText}
                  minRows={5}
                  maxRows={12}
                  classNames={{ input: "text-sm" }}
                />

                <div className="flex flex-col gap-2">
                  <Button
                    color="primary"
                    size="lg"
                    startContent={busy !== "share" && <LuShare2 />}
                    isLoading={busy === "share"}
                    isDisabled={busy !== null}
                    onPress={handleShare}
                  >
                    シェアする
                  </Button>
                  <Button
                    variant="flat"
                    startContent={busy !== "save" && <LuImageDown />}
                    isLoading={busy === "save"}
                    isDisabled={busy !== null}
                    onPress={handleSaveOnly}
                  >
                    画像だけ保存
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* iOS向け: 生成した画像を表示し、長押しで「"写真"に保存」してもらう案内 */}
      <ImageSaveGuideModal
        isOpen={saveGuideUrl !== null}
        onOpenChange={() => setSaveGuideUrl(null)}
        imageDataUrl={saveGuideUrl}
      />

      {/* キャプチャ用の画面外DOM(戦績サマリー＋対戦結果)。1枚目の画像として使う */}
      {isOpen && (
        <div
          className="pointer-events-none fixed left-[-10000px] top-0"
          aria-hidden="true"
        >
          <div
            ref={shareContentRef}
            style={{ width: 360 }}
            className="flex flex-col gap-3"
          >
            <RecordHero record={record} setRecord={setRecord} stats={stats} />
            <Card shadow="sm" className="border border-divider">
              <CardBody className="p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-default-500">
                  <LuSwords className="text-primary" /> 対戦結果
                </div>
                <Matches
                  record={record}
                  matches={matches}
                  setMatches={noopSetMatches}
                  loading={false}
                  enableCreateMatchModalButton={false}
                  enableUpdateMatchModalButton={false}
                  flat
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
