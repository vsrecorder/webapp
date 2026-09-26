"use client";

import { useRef, useState } from "react";

import { Accordion, AccordionItem, type Selection } from "@heroui/react";

import { LuList } from "react-icons/lu";

import DeckCardDetailRow from "@app/components/organisms/Deck/DeckCardDetailRow";

type Props = {
  // 表示するカードリストのデッキコード
  code: string;
  // 背景色。既定はbg-default-100。
  // bg-default-100の面（バージョン一覧のカードなど）に置く場合は"content1"を指定し、
  // 同じ面のデッキコード欄と揃えてコントラストを確保する。
  background?: "default-100" | "content1";
};

const CARD_LIST_KEY = "cardList";

/*
 * 見出しを押してから離すまでに、これ以上指が動いたら「スワイプ」とみなして開閉しない。
 *
 * カルーセル(Swiper)の中に置いたときの守り。閉じた見出しの上から横にスワイプすると、
 * Swiper がスライドを指と一緒に動かすため、離した時点でも指は見出しの上にあり、
 * 見出し(react-aria の usePress)が「押された」と判定して開いてしまう。
 * 大会結果の入賞デッキカード(Swiper で横に並ぶ)に置いていた頃に、次のカードまで届かず
 * 元に戻ったスワイプ(実測 30px・100px)で開いていた。今はそのカードには置いていない。
 *
 * 16px は useModalDragToClose の TAP_SLOP と同じ。Android の Chrome は約 8px 動くまで
 * touchmove を送らないので、それより小さいと指ぶれ程度のタップまで無効になる。
 */
const TAP_SLOP_PX = 16;

/*
 * デッキコードのカード内訳（カードリスト）を、たたんだ状態で置くためのアコーディオン。
 * 記録詳細・記録情報モーダル・デッキ詳細モーダル・バージョン一覧のように、
 * 普段は画像とコードだけを見せたい場所で使う。
 */
export default function CardListAccordion({
  code,
  background = "default-100",
}: Props) {
  // 一度でも展開したか。閉じてもfalseへは戻さない。
  // これをkeepContentMountedへ渡すことで、
  //   ・展開するまでカード内訳の取得を始めない（初期表示の通信を増やさない）
  //   ・一度開いた後は閉じてもマウントしたままにし、開き直しでの再取得・
  //     画像の読み直し・選択中タブのリセットを避ける
  // の両方を満たす。
  const [hasOpened, setHasOpened] = useState(false);

  // 開閉の状態。スワイプだった操作による開閉を無視するため、アコーディオン任せにせずここで持つ
  const [expandedKeys, setExpandedKeys] = useState<Selection>(new Set());

  // 見出しを押したときの位置と、そこから TAP_SLOP_PX 以上動いたか。
  // 描画には使わないので ref。次に押したとき・キーボードで操作したときに捨てる
  const gestureRef = useRef<{ x: number; y: number; dragged: boolean } | null>(null);

  const handleSelectionChange = (keys: Selection) => {
    // スワイプの指を離したときの「押された」は開閉として扱わない
    if (gestureRef.current?.dragged) return;

    setExpandedKeys(keys);
    if (keys === "all" || keys.has(CARD_LIST_KEY)) setHasOpened(true);
  };

  return (
    // 記録詳細では使用デッキカード全体が親のonClick（使用デッキ編集モーダル）で
    // 包まれているため、開閉のタップで編集モーダルが開かないよう伝播を止める。
    // シェア画像は操作用UIを含めたくないため、書き出し時は取り除く。
    <div
      data-capture-hide="true"
      onClick={(e) => e.stopPropagation()}
      // 開閉ボタンの押下(usePress)より先に見るため、キャプチャで拾う
      onPointerDownCapture={(e) => {
        gestureRef.current = { x: e.clientX, y: e.clientY, dragged: false };
      }}
      onPointerMoveCapture={(e) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.dragged) return;
        if (
          Math.abs(e.clientX - gesture.x) >= TAP_SLOP_PX ||
          Math.abs(e.clientY - gesture.y) >= TAP_SLOP_PX
        ) {
          gesture.dragged = true;
        }
      }}
      // Enter / Space での開閉は指の動きと関係ない。直前のスワイプの記録を持ち越さない
      onKeyDownCapture={() => {
        gestureRef.current = null;
      }}
    >
      <Accordion
        isCompact
        className="px-0"
        itemClasses={{
          base: `rounded-lg px-3 ${
            background === "content1" ? "bg-content1" : "bg-default-100"
          }`,
          trigger: "py-2",
          title: "text-tiny font-bold text-default-600",
          indicator: "text-default-500",
          // swiper-no-swiping: カルーセル(Swiper)の中に置かれたとき、展開した中身の操作で
          // カルーセルが動かないようにする。大会結果の入賞デッキカード(Swiper で横に並ぶ)に置いていた頃、
          // カード画像の行を横スクロールすると、行ではなく外側の Swiper が次のカードへ送られていた。
          // Swiper はこのクラスの付いた要素の中からはスワイプを始めない(Swiper の外では何も起きない)。
          // 見出し(開閉ボタン)には付けないので、閉じているときはこれまでどおりカルーセルを送れる
          content: "pt-0 pb-2.5 swiper-no-swiping",
        }}
        selectedKeys={expandedKeys}
        onSelectionChange={handleSelectionChange}
      >
        <AccordionItem
          key={CARD_LIST_KEY}
          aria-label="カードリスト"
          title="カードリスト"
          startContent={<LuList className="text-sm text-primary" />}
          keepContentMounted={hasOpened}
        >
          {hasOpened && <DeckCardDetailRow code={code} />}
        </AccordionItem>
      </Accordion>
    </div>
  );
}
