import { auth } from "@app/auth";
import { redirect } from "next/navigation";

import TemplateQuickRecordCreate from "@app/components/templates/QuickRecordCreate";
import { isEnvReturnEnabled } from "@app/utils/featureFlags";

type Props = {
  searchParams: Promise<{
    deck_id?: string;
    deck_code_id?: string;
    deck_name?: string;
  }>;
};

// 施策A-3: 記録＋対戦を1画面で入力する簡素化フォームのページ。
// 施策A-2 クイックスタートからは deck_id / deck_code_id / deck_name を引き継いで
// 「使用デッキ選択済み」の状態で開く。
export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { deck_id, deck_code_id, deck_name } = await searchParams;

  return (
    <TemplateQuickRecordCreate
      deckId={deck_id ?? ""}
      deckCodeId={deck_code_id ?? ""}
      deckName={deck_name ?? ""}
      envReturnEnabled={isEnvReturnEnabled()}
    />
  );
}
