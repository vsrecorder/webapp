"use client";

import { useSyncExternalStore } from "react";

import { DeckCardSkeletons } from "@app/components/organisms/Deck/Skeleton/DeckCardSkeleton";
import { useDeckListView } from "@app/hooks/useDeckListView";
import { DecksTab, readDecksInitialTab } from "@app/utils/decksSelectedTab";

// 選択中タブは cookie に保存されていて、この骨格を表示している間には変わらない
const subscribeNoop = () => () => {};

// デッキ一覧のスケルトン。保存済みの表示モードに合わせて骨格とグリッドを切り替え、
// 実データ描画時にレイアウトが組み替わって見えるのを防ぐ。
// initialTab はサーバ(loading.tsx)が cookie から読んだタブ。サーバ描画とハイドレーションで使う
export default function DeckListSkeleton({ initialTab }: { initialTab?: DecksTab }) {
  const view = useDeckListView();
  // 直前まで開いていたタブ(利用中/アーカイブ済み)。実体(TemplateDecks)と同じ規則で決める
  const serverTab = initialTab ?? "inuse";
  const tab = useSyncExternalStore(subscribeNoop, readDecksInitialTab, () => serverTab);

  return (
    <div
      className={`grid w-full ${
        view === "gallery"
          ? "gap-4 grid-cols-1 lg:grid-cols-2 lg:gap-x-6"
          : "gap-3 grid-cols-1"
      }`}
    >
      {/* ★ボタンは利用中のデッキにだけ出る(アーカイブ済みでは出ない)。
          直前のタブがアーカイブ済みなら★なしの骨格にし、実体へ切り替わった瞬間に
          カードが 20px ずつ縮むのを防ぐ */}
      <DeckCardSkeletons view={view} withFavorite={tab === "inuse"} />
    </div>
  );
}
