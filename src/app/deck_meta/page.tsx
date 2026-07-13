import type { Metadata } from "next";

import TemplateDeckMeta from "@app/components/templates/DeckMeta";

export const metadata: Metadata = {
  title: "対戦環境分析（週次デッキ使用率）| バトレコ",
  description:
    "バトレコの対戦記録から集計した、週ごとのポケモンカード対戦環境のデッキ使用率です（β機能）。",
};

// 非会員も閲覧できる公開ページのため、auth() は呼ばない。
export default async function Page() {
  return <TemplateDeckMeta />;
}
