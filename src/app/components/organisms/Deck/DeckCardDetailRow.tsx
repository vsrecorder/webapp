"use client";

import { useCallback, useEffect, useState } from "react";

import { Chip } from "@heroui/react";
import { Image } from "@heroui/react";
import { Skeleton } from "@heroui/react";
import { Tabs, Tab } from "@heroui/tabs";

import { ModalContent, ModalBody, useDisclosure } from "@heroui/react";

import { LuImage, LuTags } from "react-icons/lu";

import { Modal } from "@app/components/atoms/AppModal";
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

// カード画像1枚分の幅。基本は行の内容幅にちょうど5枚収まるよう、gap-2(8px)×4 を
// 引いた残りを5等分する。固定幅にすると画面幅ごとに収まる枚数が変わってしまう。
//
// ただし幅だけで決めてはいけない。カードの高さは幅×88/63 で決まるのに対し、
// カードを収めるタブパネルの高さは外枠の h-50 で固定されている。タブレットのように
// 行が広い画面では 5等分した幅からくる高さがパネルを超え、panel の overflow-hidden で
// カード画像の下側と枚数表示が見切れる（実測: iPad Air 820px 幅で 76px はみ出し）。
// そこで「行の高さに収まる最大の幅」を上限として掛ける。行をサイズコンテナ
// (container-type: size)にしているため、100cqh が行の内容高さ（padding を除いた高さ）
// を指す。そこから画像の下に積まれる分＝gap-1(4px)と枚数表示(16px)を引き、
// カード比 63:88 で幅へ換算したものが上限になる（引く 1.25rem がその 4px+16px）。
// 高さ側の指定（h-50 やタブバーの高さ）を変えても、この上限は自動で追従する。
// Tailwind はクラス名を静的な文字列としてしか拾えないため、値の組み立てに変数を使わない。
const CARD_WIDTH_CLASS =
  "w-[min(calc((100%-2rem)/5),calc((100cqh-1.25rem)*63/88))]";

// カード行をサイズコンテナにするための指定。上の CARD_WIDTH_CLASS が参照する
// 100cqh（＝行の内容高さ）を成立させる。h-full は、高さの決まったタブパネルから
// 行の高さを確定させるために必須（内容依存の高さのままでは cqh が引けない）。
const CARD_ROW_CONTAINER_CLASS = "h-full [container-type:size]";

// カードリスト全体（表示モード切替＋タブ＋カード行）の高さ。カテゴリータブを
// 切り替えても、カード名⇔カード画像を切り替えても高さが跳ねないよう、
// 内容ではなく固定値で持ち、両方の表示モードで同じ値を使う。
//
// sm 以上で一段高くするのはカード画像表示のため。カードの高さは幅×88/63 で決まり、
// タブレットでは行の幅がスマホの2倍近くになるため、12.5rem のままだと上限幅
// （CARD_WIDTH_CLASS）が頭打ちになり、小さなカードが左に寄って右側が大きく空いてしまう。
// dvh でのクランプは、sm 以上でも縦が短い場合（横向きのスマホなど）に
// カードリストだけで画面を埋めてしまわないようにするため。
const CARD_DETAIL_HEIGHT_CLASS = "h-50 sm:h-[clamp(12.5rem,45dvh,18rem)]";

// カテゴリータブの見た目。読み込み中の骨格と実体で必ず同じものを使う。
// panel を flex-1 にして高さを確定させるのが要点で、これが無いとパネルの高さが
// 内容依存になり、h-full で高さを引くカード行（CARD_ROW_CONTAINER_CLASS）が潰れる。
const TABS_CLASS_NAMES = {
  base: "flex flex-col",
  // タブバーの縦幅を詰める。既定の余白(p-1)と各タブ高さ(h-8)を一段小さくする
  tabList: "shrink-0 bg-content1 shadow-sm p-0.5",
  tab: "h-6",
  // カード画像1枚分の高さを確保するため、パネルの上下余白は既定より詰める
  panel: "flex-1 overflow-hidden py-2",
} as const;

// カード画像の角丸。タップで開くカードモーダルの画像（幅約336pxに対して20px＝約6%）と
// 見た目の比率を揃える。サムネイルは幅約56pxなのでその6%にあたる4pxを使う。
// モーダルと同じ20pxを当てると幅の3割を超え、別物の形に見えてしまう。
const CARD_RADIUS_CLASS = "rounded-[4px]";

function CardSkelton() {
  return (
    <div
      className={`pt-2.5 pl-1 flex gap-2 overflow-hidden ${CARD_ROW_CONTAINER_CLASS}`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={`flex shrink-0 flex-col items-center gap-1 ${CARD_WIDTH_CLASS}`}
        >
          <Skeleton className={`aspect-63/88 w-full ${CARD_RADIUS_CLASS}`} />
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
      {!loaded && <Skeleton className={`absolute inset-0 ${CARD_RADIUS_CLASS}`} />}
      {/* カード画像タップで開くモーダルと同じ「拡大しながらフェードイン」するポップ
          インにする。スケルトンと実画像の寸法差によるちらつきを、拡大の動きで目立た
          なくする狙いもあるため拡大量はやや大きめ(scale-90 → scale-100)にしている。
          HeroUI Image は内部で img の opacity/transform を独自制御するため、その影響
          を受けない自前のラッパーでアニメーションを掛ける。 */}
      <div
        className={`w-full transition duration-300 ease-out ${
          loaded ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        <Image
          // 角丸はカードモーダルの画像と同じ指定方法（radius は none にして
          // className 側で明示）に揃える。HeroUI の radius="sm" は 8px 固定のため、
          // サムネイルの幅では比率が合わない。
          radius="none"
          shadow="none"
          alt={alt}
          src={src}
          // 開いた直後は複数枚の画像が同時に届く。同期デコードだとその分だけ
          // メインスレッドが止まり、モーダルのアニメーションがカクつく。
          decoding="async"
          classNames={{ wrapper: "w-full !max-w-full" }}
          className={`w-full ${CARD_RADIUS_CLASS}`}
          onLoad={() => setLoaded(true)}
        />
      </div>
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
    <div
      className={`pt-2.5 pl-1 flex items-start gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide ${CARD_ROW_CONTAINER_CLASS}`}
    >
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

// 該当カテゴリーのカードが1枚もないとき、描画済みで空であることを明示する。
// 何も表示しないと、読み込み中なのか本当に0枚なのか区別がつかないため。
function EmptyCategory() {
  return (
    <div className="h-full pl-1 flex items-center justify-center">
      <span className="text-tiny text-default-400">このカテゴリーのカードはありません</span>
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
  if (cards.length === 0) {
    return <EmptyCategory />;
  }

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
      <div className={`w-full flex flex-col gap-1.5 ${CARD_DETAIL_HEIGHT_CLASS}`}>
        <ViewToggle view={view} onChange={handleChangeView} />
        <Tabs fullWidth size="sm" className="flex flex-col" classNames={TABS_CLASS_NAMES}>
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
      <div className={`w-full flex flex-col gap-1.5 ${CARD_DETAIL_HEIGHT_CLASS}`}>
        <ViewToggle view={view} onChange={handleChangeView} />
        <Tabs fullWidth size="sm" className="flex flex-col" classNames={TABS_CLASS_NAMES}>
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
          {(onClose) => (
            <>
              <ModalBody>
                <Image
                  radius="none"
                  shadow="none"
                  alt={pkecard?.card_name}
                  src={pkecard?.image_url}
                  onLoad={() => {}}
                  onClick={onClose}
                  className="rounded-[20px] cursor-pointer"
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
          {(onClose) => (
            <>
              <ModalBody>
                <Image
                  radius="none"
                  shadow="none"
                  alt={card?.card_name}
                  src={card?.image_url}
                  onLoad={() => {}}
                  onClick={onClose}
                  className="rounded-[20px] cursor-pointer"
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
