import type { Metadata } from "next";

import { auth } from "@app/auth";
import { redirectToSignIn, type SearchParams } from "@app/utils/signInReturnServer";

import TemplateUserReportIndex from "@app/components/templates/UserReportIndex";

export const metadata: Metadata = {
  title: "バトルレポート",
  // 本人の戦績だけを載せる非公開ページ
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams: Promise<SearchParams>;
};

// バトルレポートの入口。開ける期間をタイルで並べ、そこから各期間のレポートへ入る。
export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirectToSignIn("/users/report", await searchParams);
  }

  return <TemplateUserReportIndex userId={session.user.id} />;
}
