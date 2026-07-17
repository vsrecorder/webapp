import { auth } from "@app/auth";
import { redirect } from "next/navigation";

import TemplateCalendar from "@app/components/templates/Calendar";

// 本人の活動ログを表示する非公開ページのため、他の会員向けページ(records/decks/users)と
// 同じくメタデータは持たせず、sitemap にも載せない。
export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <TemplateCalendar userId={session.user.id} />;
}
