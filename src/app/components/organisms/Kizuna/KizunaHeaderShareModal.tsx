"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Spinner,
  addToast,
} from "@heroui/react";
import { LuDownload, LuInfo } from "react-icons/lu";

import KizunaHeaderCard from "@app/components/organisms/Kizuna/KizunaHeaderCard";
import { captureThemedPng } from "@app/utils/captureImage";
import { saveGeneratedImage } from "@app/utils/saveImage";
import { PokemonSpriteType } from "@app/types/pokemon_sprite";

// X ヘッダーの実寸(1500×500)。@2x の 3000×1000 で書き出す。
const HEADER_WIDTH = 1500;
const HEADER_HEIGHT = 500;
const HEADER_PIXEL_RATIO = 2;

// 書き出しにかける上限時間。これを超えたら失敗として扱う(ボタンが固まるのを防ぐ)。
const CAPTURE_TIMEOUT_MS = 15000;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sprites: PokemonSpriteType[];
  deckName: string;
  score: number;
  tierName: string;
  tierMessage: string;
};

/*
 * きずなLv.を X プロフィールヘッダー(1500×500)として書き出すモーダル。
 *
 * ・プレビューは実寸カードを親幅に合わせて縮小(transform: scale)して見せる。
 * ・書き出しは画面外に実寸で描画したカードを captureThemedPng で PNG 化する。
 * ・iOS の共有/保存は「タップ直後の数秒」でないと弾かれるため、開いた時点で
 *   先に書き出しておき、保存ボタンのタップ時には生成済みの画像を渡すだけにする
 *   (詳細は utils/saveImage.ts の shareRecord のコメント)。
 *
 * ヘッダーは投稿に添付するのではなく「保存して自分でプロフィールに設定する」ものなので、
 * 主導線は Web Share ではなく画像の保存(saveGeneratedImage)にする。
 */
export default function KizunaHeaderShareModal({
  isOpen,
  onClose,
  sprites,
  deckName,
  score,
  tierName,
  tierMessage,
}: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [captureFailed, setCaptureFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  // プレビューは実寸(1500px)を親要素の幅に合わせて縮小表示する。
  // モーダルは開くたびにプレビュー要素がマウント/アンマウントされるため、
  // callback ref で要素を受け取ってから測る(useRef + [isOpen] 依存だと、
  // 要素がまだ無いうちに effect が走り、縮小率が 0 のまま＝プレビューが空になる)。
  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    if (!previewEl) return;

    const update = () => setScale(previewEl.clientWidth / HEADER_WIDTH);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(previewEl);
    return () => ro.disconnect();
  }, [previewEl]);

  // スプライトの組み合わせが変わったら書き出しをやり直す。配列は毎回参照が変わるため、
  // id を連結した安定なキーで依存を張る。
  const spriteKey = useMemo(() => sprites.map((s) => s.id).join(","), [sprites]);

  // モーダルを開いたら書き出しておく(iOS 対策。理由は上のコメント)。
  const seq = useRef(0);
  useEffect(() => {
    if (!isOpen) {
      setDataUrl(null);
      setCaptureFailed(false);
      return;
    }

    const current = ++seq.current;
    setDataUrl(null);
    setCaptureFailed(false);

    (async () => {
      try {
        // 画面外DOMが実際に描画されるのを1フレーム待ってから複製する
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (!captureRef.current) return;

        const url = await Promise.race([
          captureThemedPng(captureRef.current, {
            targetWidth: HEADER_WIDTH,
            theme: "dark",
            bare: true,
            desiredPixelRatio: HEADER_PIXEL_RATIO,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("capture timeout")), CAPTURE_TIMEOUT_MS),
          ),
        ]);

        if (current !== seq.current) return;
        setDataUrl(url);
      } catch (e) {
        console.error(e);
        if (current !== seq.current) return;
        setCaptureFailed(true);
      }
    })();
  }, [isOpen, score, deckName, spriteKey]);

  const handleSave = async () => {
    if (!dataUrl) return;

    setSaving(true);
    try {
      await saveGeneratedImage(dataUrl, `kizuna_header_${score}_${Date.now()}.png`);
    } catch (e) {
      console.error(e);
      addToast({ title: "画像の保存に失敗しました", color: "danger", timeout: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const card = (
    <KizunaHeaderCard
      sprites={sprites}
      deckName={deckName}
      score={score}
      tierName={tierName}
      tierMessage={tierMessage}
    />
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        placement="center"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-0.5">
            <span className="text-base font-bold">X ヘッダー画像</span>
            <span className="text-[11px] font-normal text-default-400">
              1500×500・プロフィールのヘッダーにそのまま設定できます
            </span>
          </ModalHeader>

          <ModalBody className="gap-4 pb-6">
            {/* プレビュー(3:1)。実寸カードを縮小して見せる */}
            <div
              ref={setPreviewEl}
              className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-950"
              style={{ aspectRatio: `${HEADER_WIDTH} / ${HEADER_HEIGHT}` }}
            >
              {scale > 0 && (
                <div
                  style={{
                    width: HEADER_WIDTH,
                    height: HEADER_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                >
                  {card}
                </div>
              )}

              {/* 生成中はプレビュー上にスピナーを重ねる */}
              {!dataUrl && !captureFailed && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Spinner color="warning" />
                </div>
              )}
            </div>

            {/* 使い方:保存 → X のプロフィール編集でヘッダーに設定 */}
            <div className="flex items-start gap-2.5 rounded-xl bg-default-100 px-4 py-3">
              <LuInfo className="mt-0.5 h-4 w-4 shrink-0 text-default-400" />
              <p className="text-[11px] leading-relaxed text-default-500">
                画像を保存し、X の「プロフィールを編集」からヘッダー画像に設定してください。
                表示位置は X の編集画面で微調整できます。
              </p>
            </div>

            {captureFailed && (
              <p role="alert" className="text-xs text-danger">
                画像の生成に失敗しました。時間をおいて再度お試しください。
              </p>
            )}

            <Button
              size="lg"
              className="bg-amber-400 font-bold text-neutral-900"
              startContent={!saving && dataUrl && <LuDownload className="text-lg" />}
              isDisabled={!dataUrl || saving}
              isLoading={saving || (!dataUrl && !captureFailed)}
              onPress={handleSave}
            >
              {dataUrl ? "画像を保存" : "画像を準備しています"}
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* 書き出し用の画面外DOM。プレビューと同じカードを実寸で描画する */}
      {isOpen && (
        <div
          className="pointer-events-none fixed left-[-10000px] top-0"
          aria-hidden="true"
        >
          <div ref={captureRef}>{card}</div>
        </div>
      )}
    </>
  );
}
