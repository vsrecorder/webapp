"use client";

import { useCallback, useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Tabs, Tab } from "@heroui/tabs";

import { Modal, ModalContent, ModalBody, useDisclosure } from "@heroui/react";

import { LuImage, LuTags } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";

import { fetchDeckCardSummary } from "@app/utils/deckcard";

import { DeckCardSummaryType } from "@app/types/deckcard";
import { PkeCardType } from "@app/types/deckcard";
import { CardType } from "@app/types/deckcard";

// カードの表示モードを localStorage に保存するキー。
// 表示の好みはユーザーごとの習慣なので、次回アクセス時も同じ状態で開く。
const DECK_CARD_VIEW_STORAGE_KEY = "deckCardSummaryView";

type DeckCardSummaryView = "chip" | "image";

type Props = {
  code: string | null;
};

function ChipSkelton() {
  // Tailwind は動的なクラス名を解決できないため、幅は完全なクラス名で列挙する
  const widths = [
    "w-24",
    "w-21",
    "w-18",
    "w-22",
    "w-28",
    "w-32",
    "w-22",
    "w-18",
    "w-28",
    "w-32",
  ];

  return (
    <div className="pl-1 flex flex-wrap gap-x-1 gap-y-0">
      {widths.map((width, index) => (
        <Skeleton key={index} className={`h-5.5 rounded-2xl ${width}`} />
      ))}
    </div>
  );
}

function CardSkelton() {
  return (
    <div className="pl-1 flex gap-2 overflow-hidden">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex shrink-0 flex-col items-center gap-1">
          <Skeleton className="h-28 w-20 rounded-md" />
          <Skeleton className="h-3 w-6 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

// カード名と枚数のチップを折り返して並べる
function ChipRow<T extends { card_name: string; card_count: number }>({
  cards,
  onSelect,
}: {
  cards: T[];
  onSelect: (card: T) => void;
}) {
  // 折り返して複数行になるため、行間(gap-y)は列間(gap-x)より詰める。
  // チップ自体が上下に余白を持っており、行間まで同じだけ空けると間延びする。
  return (
    <div className="h-full overflow-y-auto pl-1 flex flex-wrap gap-x-1 gap-y-0">
      {cards.map((deckcard, index) => (
        <div key={index} onClick={() => onSelect(deckcard)}>
          <Chip
            size="sm"
            radius="md"
            color="default"
            variant="bordered"
            className="border-1.5 border-default-400 text-foreground"
          >
            <small className="font-bold">
              {deckcard.card_name}: {deckcard.card_count}
            </small>
          </Chip>
        </div>
      ))}
    </div>
  );
}

// カード1枚分のサムネイル。内訳の取得完了後に画像の読み込みが始まるため、
// 読み込み中は CardSkelton と同じ寸法（w-20・ポケモンカード比 63:88）の骨格を
// 重ねておき、空白のポップインとレイアウトシフトを防ぐ。
function CardThumbnail({ alt, src }: { alt: string; src: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-20 aspect-63/88">
      {!loaded && <Skeleton className="absolute inset-0 rounded-md" />}
      <Image
        radius="sm"
        shadow="none"
        alt={alt}
        src={src}
        // preflight の max-width:100% で幅が潰れるため max-w-none で解除する
        className="w-20 max-w-none"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// カード画像を横一列に並べ、下部に枚数を表示する（はみ出した分は横スクロールで閲覧）
function CardRow<
  T extends { card_name: string; card_count: number; image_url: string },
>({ cards, onSelect }: { cards: T[]; onSelect: (card: T) => void }) {
  return (
    <div className="pl-1 flex gap-2 overflow-x-auto scrollbar-hide">
      {cards.map((deckcard, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(deckcard)}
          className="flex shrink-0 flex-col items-center gap-1"
        >
          <CardThumbnail alt={deckcard.card_name} src={deckcard.image_url} />
          <small className="text-tiny font-bold leading-none">
            ×{deckcard.card_count}
          </small>
        </button>
      ))}
    </div>
  );
}

// チップ表示とカード画像表示を切り替えるセグメントコントロール
function ViewToggle({
  view,
  onChange,
}: {
  view: DeckCardSummaryView;
  onChange: (next: DeckCardSummaryView) => void;
}) {
  const itemClassName = (selected: boolean) =>
    `flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1 text-tiny font-bold transition-colors ${
      selected ? "bg-background text-foreground shadow-sm" : "text-default-500"
    }`;

  return (
    <div
      role="group"
      aria-label="表示モード"
      className="shrink-0 flex w-full items-center gap-0.5 rounded-lg bg-default-100 p-0.5"
    >
      <button
        type="button"
        aria-pressed={view === "chip"}
        onClick={() => onChange("chip")}
        className={itemClassName(view === "chip")}
      >
        <LuTags className="text-sm" />
        カード名
      </button>
      <button
        type="button"
        aria-pressed={view === "image"}
        onClick={() => onChange("image")}
        className={itemClassName(view === "image")}
      >
        <LuImage className="text-sm" />
        カード画像
      </button>
    </div>
  );
}

// 選択中の表示モードに応じて、チップ表示とカード画像表示を出し分ける
function SummaryRow<
  T extends { card_name: string; card_count: number; image_url: string },
>({
  view,
  cards,
  onSelect,
}: {
  view: DeckCardSummaryView;
  cards: T[];
  onSelect: (card: T) => void;
}) {
  if (view === "chip") {
    return <ChipRow cards={cards} onSelect={onSelect} />;
  }

  return <CardRow cards={cards} onSelect={onSelect} />;
}

export default function DeckCardSummaryRow({ code }: Props) {
  const [deckcardSummary, setDeckCardSummary] = useState<DeckCardSummaryType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 表示モード。SSR とのハイドレーション不一致を避けるため初期値は固定（チップ）にし、
  // マウント後に localStorage から復元する。
  const [view, setView] = useState<DeckCardSummaryView>("chip");

  const [pkecard, setPkeCard] = useState<PkeCardType>();
  const {
    isOpen: isOpenForShowPkeCardModal,
    onOpen: onOpenForShowPkeCardModal,
    onOpenChange: onOpenChangeForShowPkeCardModal,
  } = useDisclosure();

  const [card, setCard] = useState<CardType>();
  const {
    isOpen: isOpenForShowCardModal,
    onOpen: onOpenForShowCardModal,
    onOpenChange: onOpenChangeForShowCardModal,
  } = useDisclosure();

  useEffect(() => {
    const saved = localStorage.getItem(DECK_CARD_VIEW_STORAGE_KEY);
    if (saved === "chip" || saved === "image") {
      setView(saved);
    }
  }, []);

  const handleChangeView = (next: DeckCardSummaryView) => {
    setView(next);
    localStorage.setItem(DECK_CARD_VIEW_STORAGE_KEY, next);
  };

  useEffect(() => {
    if (!deckcardSummary) {
      return;
    }

    const urls = [
      ...deckcardSummary.card_pke,
      ...deckcardSummary.card_gds,
      ...deckcardSummary.card_tool,
      ...deckcardSummary.card_sup,
      ...deckcardSummary.card_sta,
      ...deckcardSummary.card_ene,
    ].map((c) => c.image_url);

    const uniqueUrls = [...new Set(urls)];

    uniqueUrls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, [deckcardSummary]);

  // デッキカード内訳だけを取得（失敗時のリロードから再利用）
  const loadDeckCardSummary = useCallback(async () => {
    if (!code) {
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const data = await fetchDeckCardSummary(code);
      setDeckCardSummary(data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadDeckCardSummary();
  }, [loadDeckCardSummary]);

  if (!code) return;

  if (loading) {
    const skelton = view === "chip" ? <ChipSkelton /> : <CardSkelton />;

    return (
      <div className="h-56 w-full flex flex-col gap-1.5">
        <ViewToggle view={view} onChange={handleChangeView} />
        <Tabs fullWidth size="sm" classNames={{ tabList: "bg-content1 shadow-sm" }}>
          <Tab key="card_pke" title={`ポケモン：??`}>
            {skelton}
          </Tab>

          <Tab key="card_gds" title={`グッズ：??`}>
            {skelton}
          </Tab>

          <Tab key="card_tool" title={`ポケモンのどうぐ：??`}>
            {skelton}
          </Tab>

          <Tab key="card_sup" title={`サポート：??`}>
            {skelton}
          </Tab>

          <Tab key="card_sta" title={`スタジアム：??`}>
            {skelton}
          </Tab>

          <Tab key="card_ene" title={`エネルギー：??`}>
            {skelton}
          </Tab>
        </Tabs>
      </div>
    );
  }

  if (error) {
    return <FetchError onRetry={loadDeckCardSummary} compact />;
  }

  if (!deckcardSummary) return;

  return (
    <>
      <div className="h-56 w-full flex flex-col gap-1.5">
        <ViewToggle view={view} onChange={handleChangeView} />
        <Tabs
          fullWidth
          size="sm"
          className="flex flex-col"
          classNames={{
            base: "flex flex-col",
            tabList: "shrink-0 bg-content1 shadow-sm",
            // カード画像1枚分の高さを確保するため、パネルの上下余白は既定より詰める
            panel: "flex-1 overflow-hidden py-2",
          }}
        >
          <Tab key="card_pke" title={`ポケモン：${deckcardSummary.card_pke_count}`}>
            <SummaryRow
              view={view}
              cards={deckcardSummary.card_pke}
              onSelect={(deckcard) => {
                setPkeCard(deckcard);
                onOpenForShowPkeCardModal();
              }}
            />
          </Tab>
          <Tab key="card_gds" title={`グッズ：${deckcardSummary.card_gds_count}`}>
            <SummaryRow
              view={view}
              cards={deckcardSummary.card_gds}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
          <Tab
            key="card_tool"
            title={`ポケモンのどうぐ：${deckcardSummary.card_tool_count}`}
          >
            <SummaryRow
              view={view}
              cards={deckcardSummary.card_tool}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
          <Tab key="card_sup" title={`サポート：${deckcardSummary.card_sup_count}`}>
            <SummaryRow
              view={view}
              cards={deckcardSummary.card_sup}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
          <Tab key="card_sta" title={`スタジアム：${deckcardSummary.card_sta_count}`}>
            <SummaryRow
              view={view}
              cards={deckcardSummary.card_sta}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
          <Tab key="card_ene" title={`エネルギー：${deckcardSummary.card_ene_count}`}>
            <SummaryRow
              view={view}
              cards={deckcardSummary.card_ene}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
        </Tabs>
      </div>

      <Modal
        isOpen={isOpenForShowPkeCardModal}
        size={"sm"}
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChangeForShowPkeCardModal}
        onClose={() => {}}
        classNames={{
          base: "sm:max-w-full bg-transparent shadow-none border-none",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalBody>
                <Image
                  radius="none"
                  shadow="none"
                  alt={pkecard?.card_name}
                  src={pkecard?.image_url}
                  onLoad={() => {}}
                  className="rounded-[20px]"
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isOpenForShowCardModal}
        size={"sm"}
        placement="center"
        hideCloseButton
        onOpenChange={onOpenChangeForShowCardModal}
        onClose={() => {}}
        classNames={{
          base: "sm:max-w-full bg-transparent shadow-none border-none",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalBody>
                <Image
                  radius="none"
                  shadow="none"
                  alt={card?.card_name}
                  src={card?.image_url}
                  onLoad={() => {}}
                  className="rounded-[20px]"
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
