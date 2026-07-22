"use client";

import { useState } from "react";

import { Accordion, AccordionItem } from "@heroui/react";

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

  return (
    // 記録詳細では使用デッキカード全体が親のonClick（使用デッキ編集モーダル）で
    // 包まれているため、開閉のタップで編集モーダルが開かないよう伝播を止める。
    // シェア画像は操作用UIを含めたくないため、書き出し時は取り除く。
    <div data-capture-hide="true" onClick={(e) => e.stopPropagation()}>
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
          content: "pt-0 pb-2.5",
        }}
        // たたんだ状態から始まるため、初回の変化は必ず「開く」操作になる
        onSelectionChange={() => setHasOpened(true)}
      >
        <AccordionItem
          key="cardList"
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
