"use client";

import { useCallback, useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Tabs, Tab } from "@heroui/tabs";

import { Modal, ModalContent, ModalBody, useDisclosure } from "@heroui/react";

import { LuImage, LuTags } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";

import { fetchDeckCardDetail } from "@app/utils/deckcard";

import { DeckCardDetailType } from "@app/types/deckcard";
import { PkeCardType } from "@app/types/deckcard";
import { CardType } from "@app/types/deckcard";

// カードの表示モードを localStorage に保存するキー。
// 表示の好みはユーザーごとの習慣なので、次回アクセス時も同じ状態で開く。
const DECK_CARD_VIEW_STORAGE_KEY = "deckCardDetailView";

// 画像先読みの開始を遅らせる時間。モーダルの開閉アニメーション（約300ms）が
// 終わるまで待ってから読み始める。
const PRELOAD_START_DELAY_MS = 400;

// 画像先読みの同時実行数。表示中のカード画像のダウンロードから接続枠を奪わない
// 程度に抑える。
const PRELOAD_CONCURRENCY = 4;

type DeckCardDetailView = "chip" | "image";

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
    <div className="pl-1 flex flex-wrap gap-1">
      {widths.map((width, index) => (
        <Skeleton key={index} className={`h-5.5 rounded-2xl ${width}`} />
      ))}
    </div>
  );
}

// カード画像1枚分の幅。画面(行の内容幅)にちょうど5枚収まるよう、gap-2(8px)×4 を
// 引いた残りを5等分する。固定幅にすると画面幅ごとに収まる枚数が変わってしまう。
const CARD_WIDTH_CLASS = "w-[calc((100%-2rem)/5)]";

function CardSkelton() {
  return (
    <div className="pt-2.5 pl-1 flex gap-2 overflow-hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={`flex shrink-0 flex-col items-center gap-1 ${CARD_WIDTH_CLASS}`}
        >
          <Skeleton className="aspect-63/88 w-full rounded-md" />
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
  // content-start は必須。h-full の折返しコンテナでは align-content の既定値 stretch により
  // 各行が余った高さを分け合って伸び、行間が gap とは無関係に間延びしてしまう。
  return (
    <div className="h-full overflow-y-auto pl-1 flex flex-wrap content-start gap-1">
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
// 読み込み中は CardSkelton と同じ寸法（ポケモンカード比 63:88）の骨格を
// 重ねておき、空白のポップインとレイアウトシフトを防ぐ。
// 幅は親(CardRow のボタン)から受け取るため w-full で追従させる。HeroUI Image は
// img を max-width:fit-content のラッパーで包むため、ラッパー側も w-full へ広げないと
// 画像が本来の幅のまま親からはみ出す。
function CardThumbnail({ alt, src }: { alt: string; src: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative aspect-63/88 w-full">
      {!loaded && <Skeleton className="absolute inset-0 rounded-md" />}
      <Image
        radius="sm"
        shadow="none"
        alt={alt}
        src={src}
        // 開いた直後は複数枚の画像が同時に届く。同期デコードだとその分だけ
        // メインスレッドが止まり、モーダルのアニメーションがカクつく。
        decoding="async"
        classNames={{ wrapper: "w-full !max-w-full" }}
        className="w-full"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// カード画像を横一列に並べ、下部に枚数を表示する（はみ出した分は横スクロールで閲覧）
function CardRow<T extends { card_name: string; card_count: number; image_url: string }>({
  cards,
  onSelect,
}: {
  cards: T[];
  onSelect: (card: T) => void;
}) {
  // overflow-x-auto だけだと、CSS 仕様により overflow-y も auto に計算され、この要素が
  // 縦スクロールコンテナになる。縦スクロール量ゼロ（1行のみ）でも iOS 等は縦タッチを奪って
  // ラバーバンドで跳ね返るため、カード画像が引き伸びて見え、ページも下にスクロールできなくなる。
  // overflow-y-hidden を明示して縦スクロールコンテナ化を防ぎ、縦スワイプはページへ委ねる。
  // overscroll-x-contain は横スクロールを端まで送っても背面へ伝播させないため。
  // items-start は、行の高さ変動時に子が縦へ引き伸ばされないよう上詰めで固定する。
  return (
    <div className="pt-2.5 pl-1 flex items-start gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide">
      {cards.map((deckcard, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(deckcard)}
          className={`flex shrink-0 flex-col items-center gap-1 ${CARD_WIDTH_CLASS}`}
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
  view: DeckCardDetailView;
  onChange: (next: DeckCardDetailView) => void;
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
function CategoryCardRow<
  T extends { card_name: string; card_count: number; image_url: string },
>({
  view,
  cards,
  onSelect,
}: {
  view: DeckCardDetailView;
  cards: T[];
  onSelect: (card: T) => void;
}) {
  if (view === "chip") {
    return <ChipRow cards={cards} onSelect={onSelect} />;
  }

  return <CardRow cards={cards} onSelect={onSelect} />;
}

export default function DeckCardDetailRow({ code }: Props) {
  const [deckcardDetail, setDeckCardDetail] = useState<DeckCardDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 表示モード。SSR とのハイドレーション不一致を避けるため初期値は固定（チップ）にし、
  // マウント後に localStorage から復元する。
  const [view, setView] = useState<DeckCardDetailView>("chip");

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

  const handleChangeView = (next: DeckCardDetailView) => {
    setView(next);
    localStorage.setItem(DECK_CARD_VIEW_STORAGE_KEY, next);
  };

  // 他タブのカード画像を先読みしてタブ切替時の待ちを減らす。
  // 内訳の取得完了はモーダルの開閉アニメーション中に訪れるため、全カード（50枚超）を
  // 一斉に読み込むとデコードでメインスレッドが詰まり、同時接続枠も奪われて表示中の
  // カード画像の取得まで遅れる。結果としてモーダルがカクつくので、アニメーションの
  // 完了を待ってから、少数ずつブラウザの空き時間に読み込む。
  useEffect(() => {
    if (!deckcardDetail) {
      return;
    }

    const urls = [
      ...deckcardDetail.card_pke,
      ...deckcardDetail.card_gds,
      ...deckcardDetail.card_tool,
      ...deckcardDetail.card_sup,
      ...deckcardDetail.card_sta,
      ...deckcardDetail.card_ene,
    ].map((c) => c.image_url);

    const uniqueUrls = [...new Set(urls)];

    let cancelled = false;
    let cursor = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // requestIdleCallback 非対応環境（Safari の一部バージョン）では setTimeout で代替する
    const scheduleIdle = (task: () => void) => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(task, { timeout: 1000 });
      } else {
        timers.push(setTimeout(task, 0));
      }
    };

    // 1枚読み終わるごとに次の1枚を予約することで、同時実行数を初回の起動数に保つ
    const preloadNext = () => {
      if (cancelled || cursor >= uniqueUrls.length) return;

      const url = uniqueUrls[cursor];
      cursor += 1;

      const img = new window.Image();
      img.decoding = "async";
      const next = () => scheduleIdle(preloadNext);
      img.onload = next;
      img.onerror = next;
      img.src = url;
    };

    timers.push(
      setTimeout(() => {
        for (let i = 0; i < PRELOAD_CONCURRENCY; i++) {
          preloadNext();
        }
      }, PRELOAD_START_DELAY_MS),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [deckcardDetail]);

  // デッキカード内訳だけを取得（失敗時のリロードから再利用）
  const loadDeckCardDetail = useCallback(async () => {
    if (!code) {
      setLoading(false);
      return;
    }

    setError(false);
    setLoading(true);

    try {
      const data = await fetchDeckCardDetail(code);
      setDeckCardDetail(data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadDeckCardDetail();
  }, [loadDeckCardDetail]);

  if (!code) return;

  if (loading) {
    const skelton = view === "chip" ? <ChipSkelton /> : <CardSkelton />;

    return (
      <div className="h-50 w-full flex flex-col gap-1.5">
        <ViewToggle view={view} onChange={handleChangeView} />
        <Tabs
          fullWidth
          size="sm"
          classNames={{ tabList: "bg-content1 shadow-sm p-0.5", tab: "h-6" }}
        >
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
    return <FetchError onRetry={loadDeckCardDetail} compact />;
  }

  if (!deckcardDetail) return;

  return (
    <>
      <div className="h-50 w-full flex flex-col gap-1.5">
        <ViewToggle view={view} onChange={handleChangeView} />
        <Tabs
          fullWidth
          size="sm"
          className="flex flex-col"
          classNames={{
            base: "flex flex-col",
            // タブバーの縦幅を詰める。既定の余白(p-1)と各タブ高さ(h-8)を一段小さくする
            tabList: "shrink-0 bg-content1 shadow-sm p-0.5",
            tab: "h-6",
            // カード画像1枚分の高さを確保するため、パネルの上下余白は既定より詰める
            panel: "flex-1 overflow-hidden py-2",
          }}
        >
          <Tab key="card_pke" title={`ポケモン：${deckcardDetail.card_pke_count}`}>
            <CategoryCardRow
              view={view}
              cards={deckcardDetail.card_pke}
              onSelect={(deckcard) => {
                setPkeCard(deckcard);
                onOpenForShowPkeCardModal();
              }}
            />
          </Tab>
          <Tab key="card_gds" title={`グッズ：${deckcardDetail.card_gds_count}`}>
            <CategoryCardRow
              view={view}
              cards={deckcardDetail.card_gds}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
          <Tab
            key="card_tool"
            title={`ポケモンのどうぐ：${deckcardDetail.card_tool_count}`}
          >
            <CategoryCardRow
              view={view}
              cards={deckcardDetail.card_tool}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
          <Tab key="card_sup" title={`サポート：${deckcardDetail.card_sup_count}`}>
            <CategoryCardRow
              view={view}
              cards={deckcardDetail.card_sup}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
          <Tab key="card_sta" title={`スタジアム：${deckcardDetail.card_sta_count}`}>
            <CategoryCardRow
              view={view}
              cards={deckcardDetail.card_sta}
              onSelect={(deckcard) => {
                setCard(deckcard);
                onOpenForShowCardModal();
              }}
            />
          </Tab>
          <Tab key="card_ene" title={`エネルギー：${deckcardDetail.card_ene_count}`}>
            <CategoryCardRow
              view={view}
              cards={deckcardDetail.card_ene}
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
