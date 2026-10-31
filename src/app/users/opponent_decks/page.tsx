import type { Metadata } from "next";

import { auth } from "@app/auth";
import { redirectToSignIn, type SearchParams } from "@app/utils/signInReturnServer";

import TemplateOpponentDecks from "@app/components/templates/OpponentDecks";

export const metadata: Metadata = {
  title: "相手デッキの一括編集",
  // 本人の対戦結果を書き換える非公開ページ
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams: Promise<SearchParams>;
};

// 相手デッキの一括編集。ユーザメニューから開く。
export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirectToSignIn("/users/opponent_decks", await searchParams);
  }

  return <TemplateOpponentDecks />;
}
