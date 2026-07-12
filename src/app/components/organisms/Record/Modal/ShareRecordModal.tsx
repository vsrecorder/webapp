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
  addToast,
} from "@heroui/react";

import { LuShare2 } from "react-icons/lu";

import RecordHero from "@app/components/organisms/Record/Hero/RecordHero";
import Matches from "@app/components/organisms/Match/Matches";

import { captureThemedPng, SIDE_PADDING } from "@app/utils/captureImage";
import {
  shareRecord,
  saveGeneratedImage,
  dataUrlToFile,
  type ShareImage,
} from "@app/utils/saveImage";

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
 * 画面外に「戦績サマリー＋対戦結果」をレンダリングして1枚目の画像を生成し、
 * 「使用デッキを表示しない」ONのときは1枚目から使用デッキの描画を省く。
 * 「使用デッキの画像も一緒にシェア」ONのときはデッキコードパネルを2枚目として追加する。
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
  // キャプチャ対象(戦績カード)の幅。書き出し画像の横幅が端末の画面幅いっぱいに
  // なるよう、端末の画面幅から左右余白(SIDE_PADDING * 2)を引いた値を使う。
  //   最終画像の横幅 = captureWidth + SIDE_PADDING * 2 = 端末の画面幅
  // SSR時はwindowを参照できないため従来の360で初期化し、モーダルを開いたときに
  // クライアント側で実際の画面幅から算出する。極端な幅を避けるためクランプする。
  const [captureWidth, setCaptureWidth] = useState(360);
  const [includeDeck, setIncludeDeck] = useState(false);
  // 1枚目の戦績画像に使用デッキを描画しない(使用デッキを表示しない)
  const [hideDeck, setHideDeck] = useState(false);
  // ポスト文に含める要素(対戦結果・使用デッキ)
  const [includePostMatches, setIncludePostMatches] = useState(true);
  const [includePostDeck, setIncludePostDeck] = useState(true);
  // 実行中の処理種別。処理中はローディング表示とモーダルのクローズ抑止に使う
  const [busy, setBusy] = useState<null | "share">(null);
  const [text, setText] = useState("");

  // キャプチャ用の RecordHero がイベント・使用デッキを描画し終えたか。
  // 描画完了(＋対戦一覧の取得完了)までシェア/保存を無効化し、
  // スケルトン状態のまま画像が生成されるのを防ぐ。
  const [heroReady, setHeroReady] = useState(false);
  // シェア用に生成済みの画像。タップ前に用意しておく(理由は生成用の useEffect を参照)。
  const [images, setImages] = useState<ShareImage[] | null>(null);
  const canShare = heroReady && matches !== null && images !== null;

  // モーダルを閉じるとキャプチャ用 DOM は破棄されるため、次に開いたときは
  // 再度描画完了を待つよう準備状態をリセットする。
  // あわせて生成済み画像も捨てる(次に開いたとき古い画像を共有してしまわないよう)。
  useEffect(() => {
    if (!isOpen) {
      setHeroReady(false);
      setImages(null);
    }
  }, [isOpen]);

  // モーダルを開いたら、書き出し画像の横幅が端末の画面幅いっぱいになるよう
  // キャプチャ対象の幅を算出する。画面が狭すぎ/PCなどで広すぎる場合に備えクランプする。
  useEffect(() => {
    if (!isOpen) return;
    const target = Math.round(window.innerWidth) - SIDE_PADDING * 2;
    setCaptureWidth(Math.max(320, Math.min(target, 480)));
  }, [isOpen]);

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

  // 上部バーのフリックでモーダルを閉じる(記録情報モーダルと同じ挙動)。
  // ただしシェア/保存の処理中(busy)は閉じさせない。
  const startY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (busy !== null) return;
    startY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (busy !== null || startY.current === null) return;
    if (e.touches[0].clientY - startY.current > 30) {
      startY.current = null;
      onClose();
    }
  };

  // シェア画像は「シェアする」をタップする前に生成しておく。
  //
  // iOS(WebKit)の navigator.share() は、タップから数秒(transient activation)の間に
  // 呼ばないと NotAllowedError で失敗する。タップハンドラ内で画像を生成すると、
  // とくに2枚目(デッキ画像)を追加したときに生成が猶予を超え、共有が必ず失敗していた。
  // そこでモーダルを開いた時点・オプション変更時に生成しておき、タップ時は
  // 生成済みの File を渡して即座に navigator.share() を呼ぶ。
  //
  // 生成中に条件が変わった場合、後から終わった古い生成結果で上書きしないよう
  // 世代番号(seq)で自分が最新かを確認してから反映する。
  const captureSeq = useRef(0);
  useEffect(() => {
    if (!isOpen || !heroReady || matches === null) return;

    const seq = ++captureSeq.current;
    setImages(null);

    (async () => {
      try {
        const captured: ShareImage[] = [];

        if (shareContentRef.current) {
          const dataUrl = await captureThemedPng(shareContentRef.current, {
            targetWidth: captureWidth,
          });
          const filename = `${record.id}_result_${Date.now()}.png`;
          captured.push({
            dataUrl,
            filename,
            file: await dataUrlToFile(dataUrl, filename),
          });
        }

        if (includeDeck && deckCardRef.current) {
          // 2枚目(デッキ画像)も端末幅に合わせて、1枚目と同じ横幅で書き出す
          const dataUrl = await captureThemedPng(deckCardRef.current, {
            targetWidth: captureWidth,
          });
          const filename = `${record.id}_deck_${Date.now()}.png`;
          captured.push({
            dataUrl,
            filename,
            file: await dataUrlToFile(dataUrl, filename),
          });
        }

        if (seq !== captureSeq.current) return;
        setImages(captured);
      } catch (e) {
        console.error(e);
        if (seq !== captureSeq.current) return;
        addToast({
          title: "画像の生成に失敗しました",
          color: "danger",
          timeout: 5000,
        });
      }
    })();
  }, [
    isOpen,
    heroReady,
    matches,
    includeDeck,
    hideDeck,
    captureWidth,
    record.id,
    deckCardRef,
  ]);

  // 注意: navigator.share() の呼び出し前に await を挟むとユーザーアクティベーションが
  // 切れるため、この関数内では shareRecord() の前で await しないこと。
  const handleShare = async () => {
    if (!canShare || images === null || images.length === 0) return;
    setBusy("share");
    try {
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        // シェア/保存の処理中(busy)は閉じさせない
        onOpenChange={() => {
          if (busy !== null) return;
          onOpenChange();
        }}
        placement="bottom"
        hideCloseButton
        isDismissable={false}
        scrollBehavior="inside"
        className="h-[calc(100dvh-104px)] max-h-[calc(100dvh-104px)] mt-26 my-0 rounded-b-none sm:max-w-full lg:max-w-lg"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="flex cursor-grab touch-none flex-col gap-1 px-4 pb-3 pt-3"
              >
                <div className="mx-auto mb-1 h-1 w-32 rounded-full bg-default-300" />
                <div className="flex items-center gap-2">
                  <LuShare2 className="text-primary" />
                  シェア
                </div>
              </ModalHeader>
              <ModalBody className="gap-5 px-4 pb-3">
                <p className="text-tiny text-default-500">
                  記録の戦績を画像にして、ポスト文と一緒にシェアできます。
                </p>

                {/* 使用デッキがある場合のみ、使用デッキ関連のトグルを出す。 */}
                {record.deck_id && (
                  <div className="flex flex-col gap-2.5">
                    {/* 1枚目の戦績画像に使用デッキを描画しない */}
                    <div className="flex items-center gap-3 rounded-xl border border-divider bg-content2 px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-default-200 text-lg">
                        🙈
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">使用デッキを表示しない</div>
                        <div className="text-[11px] text-default-400">
                          戦績画像に使用デッキを描画しません
                        </div>
                      </div>
                      <Switch
                        size="sm"
                        isSelected={hideDeck}
                        onValueChange={setHideDeck}
                        aria-label="使用デッキを表示しない"
                      />
                    </div>

                    {/* 2枚目としてデッキ画像を追加する */}
                    <div className="flex items-center gap-3 rounded-xl border border-divider bg-content2 px-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                        🎴
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">
                          使用デッキの画像も一緒にシェア
                        </div>
                        <div className="text-[11px] text-default-400">
                          デッキ画像を2枚目として追加します
                        </div>
                      </div>
                      <Switch
                        size="sm"
                        isSelected={includeDeck}
                        onValueChange={setIncludeDeck}
                        aria-label="使用デッキの画像も一緒にシェア"
                      />
                    </div>
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

                {/* iOSでは<textarea>の既定のoverflowがautoのため、モーダルのスクロール抑止
                    (react-ariaのpreventScrollMobileSafari)が「テキストエリア自身がスクロール
                    可能」と誤判定し、内容が収まっていてもtouchmoveをpreventDefaultしてしまう。
                    結果、テキストエリアの上で指を動かしてもモーダルがスクロールしなくなる。
                    overflowを持たせず内容の高さまで伸ばし、スクロールはモーダル本体に任せる。 */}
                <Textarea
                  label="ポスト文"
                  value={text}
                  onValueChange={setText}
                  minRows={5}
                  // 内容を隠さない(＝テキストエリア内スクロールを発生させない)ための上限
                  maxRows={999}
                  classNames={{ input: "text-sm overflow-hidden" }}
                />

                <div className="flex flex-col gap-2">
                  {/* 画像の準備が終わるまでは「シェアする」ボタン上に準備中を表示し、
                      スピナー付きで無効化する(準備完了までシェアさせない)。 */}
                  <Button
                    color="primary"
                    size="lg"
                    startContent={busy !== "share" && canShare && <LuShare2 />}
                    isLoading={busy === "share" || !canShare}
                    isDisabled={busy !== null || !canShare}
                    onPress={handleShare}
                  >
                    {canShare ? "シェアする" : "画像を準備しています"}
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* キャプチャ用の画面外DOM。戦績サマリー＋使用デッキ＋対戦結果を1枚のカードに統合して画像にする */}
      {isOpen && (
        <div
          className="pointer-events-none fixed left-[-10000px] top-0"
          aria-hidden="true"
        >
          <div ref={shareContentRef} style={{ width: captureWidth }}>
            <RecordHero
              record={record}
              setRecord={setRecord}
              stats={stats}
              hideDeck={hideDeck}
              onReadyChange={setHeroReady}
              matchesSlot={
                <Matches
                  record={record}
                  matches={matches}
                  setMatches={noopSetMatches}
                  loading={false}
                  enableCreateMatchModalButton={false}
                  enableUpdateMatchModalButton={false}
                  flat
                />
              }
            />
          </div>
        </div>
      )}
    </>
  );
}
