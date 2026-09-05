"use client";

import { LuLayoutGrid, LuList } from "react-icons/lu";

import SegmentedButtons from "@app/components/molecules/SegmentedButtons";

import { setDeckListView, useDeckListView } from "@app/hooks/useDeckListView";

// リスト＝素早く探す、ギャラリー＝画像で見て探す、を用途で使い分ける
const OPTIONS = [
  { key: "list", label: (<><LuList className="text-xs" />リスト</>), title: "リスト表示" },
  { key: "gallery", label: (<><LuLayoutGrid className="text-xs" />ギャラリー</>), title: "ギャラリー表示" },
] as const;

/*
 * デッキ一覧のリスト／ギャラリー表示の切り替え。表示モードは localStorage に保存され
 * (useDeckListView)、一覧(Decks)がそれを購読して並びを変える。
 */
export default function DeckViewToggle() {
  const view = useDeckListView();

  return (
    <SegmentedButtons options={OPTIONS} value={view} onChange={setDeckListView} ariaLabel="表示モード" />
  );
}
