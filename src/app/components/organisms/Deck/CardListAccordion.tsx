"use client";

import { useState } from "react";

import { Accordion, AccordionItem } from "@heroui/react";

import { LuList } from "react-icons/lu";

import DeckCardDetailRow from "@app/components/organisms/Deck/DeckCardDetailRow";

import { DeckSummaryType } from "@app/types/deckcard";

type Props = {
  // 表示するカードリストのデッキコード
  code: string;
  // 背景色。既定はbg-default-100。
  // bg-default-100の面（バージョン一覧のカードなど）に置く場合は"content1"を指定し、
  // 同じ面のデッキコード欄と揃えてコントラストを確保する。
  background?: "default-100" | "content1";
  // サーバ側で取得済みのカード内訳の要約。渡すと、開くまでのあいだ中身としてテキスト版を
  // HTML に載せておく(検索エンジン向け。大会結果のカードで使う)。
  summary?: DeckSummaryType;
  // 押せない状態で置く。デッキコードの無い大会結果のカードで、他のカードと高さを揃えるために使う。
  isDisabled?: boolean;
};

/*
 * 開く前のアコーディオンに載せておくテキスト版のカードリスト。
 *
 * 大会結果ページはデッキを CDN の画像でしか出しておらず、カード名が HTML に無いと
 * 検索エンジンは「何のデッキか」を読めない。たたんだ中身として載せておけば画面には出ず、
 * 開いた時点で通常のカードリスト(DeckCardDetailRow)に置き換わる。
 *
 * invisible(visibility: hidden)と aria-hidden は必須。たたんだ中身は高さ0・透明で見えない
 * だけで、そのままだとスクリーンリーダーが閉じたままのカード名を全カードぶん読み上げ
 * (実測: 大会結果の1ページで287ノード)、ページ内検索も見えない文字に当たって何も無い所へ
 * 飛ぶ。このテキストは表示されることがない(開くと置き換わる)ので、常に隠してよい。
 * HTML には残るので検索エンジンは読める。
 */
function DeckSummaryText({ summary }: { summary: DeckSummaryType }) {
  return (
    <dl
      aria-hidden="true"
      className="invisible flex flex-col gap-1 text-tiny text-default-500"
    >
      {summary.groups.map((group) => (
        <div key={group.label}>
          <dt className="inline font-bold text-default-600">
            {group.label}（{group.count}）：
          </dt>
          <dd className="inline">
            {group.cards.map((card) => `${card.name} ×${card.count}`).join("、")}
          </dd>
        </div>
      ))}
      {summary.aceSpec && (
        <div>
          <dt className="inline font-bold text-default-600">ACE SPEC：</dt>
          <dd className="inline">{summary.aceSpec}</dd>
        </div>
      )}
    </dl>
  );
}

/*
 * デッキコードのカード内訳（カードリスト）を、たたんだ状態で置くためのアコーディオン。
 * 記録詳細・記録情報モーダル・デッキ詳細モーダル・バージョン一覧のように、
 * 普段は画像とコードだけを見せたい場所で使う。
 */
export default function CardListAccordion({
  code,
  background = "default-100",
  summary,
  isDisabled = false,
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
    // 押せない状態のときは開閉が無いので止めず、親のカードと同じくタップを親へ渡す。
    // シェア画像は操作用UIを含めたくないため、書き出し時は取り除く。
    <div
      data-capture-hide="true"
      onClick={isDisabled ? undefined : (e) => e.stopPropagation()}
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
          isDisabled={isDisabled}
          // テキスト版を載せるときは、開く前から中身をマウントしておく
          keepContentMounted={hasOpened || !!summary}
        >
          {hasOpened ? (
            <DeckCardDetailRow code={code} />
          ) : (
            summary && <DeckSummaryText summary={summary} />
          )}
        </AccordionItem>
      </Accordion>
    </div>
  );
}
