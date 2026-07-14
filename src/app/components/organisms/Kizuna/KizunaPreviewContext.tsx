"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

/*
 * 試算セクション（KizunaSimulator / KizunaDeckEstimator）で選ばれたデッキと
 * 試算結果を、下の「デッキ一覧では、こう見えます」プレビューへ渡すための入れ物。
 *
 * 両者はページ上の別々の <section> にあり、間にサーバーコンポーネントの静的な
 * マークアップを挟む。props で引き回すには Kizuna.tsx 全体を client 化する必要が
 * あるため、Provider だけを client にして children はサーバーのまま通す。
 */

// 実際の対戦記録から求めた戦績。質問式の試算では持てないため、その場合は null。
export type KizunaPreviewStats = {
  // 0〜1
  winRate: number;
  wins: number;
  losses: number;
  matchCount: number;
  goFirstCount: number;
  // 0〜1
  goFirstRate: number;
  goFirstWinRate: number;
  goSecondCount: number;
  goSecondWinRate: number;
};

export type KizunaPreviewDeck = {
  deckName: string;
  // 先頭2体のスプライトID
  spriteIds: string[];
  kizunaLevel: number;
  // 登録日（整形済み）。質問式の試算では持てないため null。
  registeredAt: string | null;
  stats: KizunaPreviewStats | null;
};

const DeckContext = createContext<KizunaPreviewDeck | null>(null);
const SetDeckContext = createContext<Dispatch<SetStateAction<KizunaPreviewDeck | null>>>(
  () => {},
);

export function KizunaPreviewProvider({ children }: { children: ReactNode }) {
  const [deck, setDeck] = useState<KizunaPreviewDeck | null>(null);

  return (
    <SetDeckContext.Provider value={setDeck}>
      <DeckContext.Provider value={deck}>{children}</DeckContext.Provider>
    </SetDeckContext.Provider>
  );
}

// プレビュー側。試算がまだなら null（モックのサンプルを出す）
export function useKizunaPreviewDeck() {
  return useContext(DeckContext);
}

/*
 * 試算側。Provider の外（他ページでの単体利用など）では何もしない関数が返るため、
 * 呼び出し側は Provider の有無を気にしなくてよい。
 */
export function useSetKizunaPreviewDeck() {
  return useContext(SetDeckContext);
}
