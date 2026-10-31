import { auth } from "@app/auth";
import { redirectToSignIn, type SearchParams } from "@app/utils/signInReturnServer";

import TemplateCalendar from "@app/components/templates/Calendar";

type Props = {
  searchParams: Promise<SearchParams>;
};

// 本人の活動ログを表示する非公開ページのため、他の会員向けページ(records/decks/users)と
// 同じくメタデータは持たせず、sitemap にも載せない。
export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirectToSignIn("/calendar", await searchParams);
  }

  return <TemplateCalendar userId={session.user.id} />;
}
