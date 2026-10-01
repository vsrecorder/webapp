import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@app/auth";

import TemplateOpponentDecks from "@app/components/templates/OpponentDecks";

export const metadata: Metadata = {
  title: "相手デッキの一括編集",
  // 本人の対戦結果を書き換える非公開ページ
  robots: {
    index: false,
    follow: false,
  },
};

// 相手デッキの一括編集。ユーザメニューから開く。
export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <TemplateOpponentDecks />;
}
