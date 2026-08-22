import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@app/auth";

import TemplateUserReportIndex from "@app/components/templates/UserReportIndex";

export const metadata: Metadata = {
  title: "バトルレポート",
  // 本人の戦績だけを載せる非公開ページ
  robots: {
    index: false,
    follow: false,
  },
};

// バトルレポートの入口。開ける期間をタイルで並べ、そこから各期間のレポートへ入る。
export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <TemplateUserReportIndex userId={session.user.id} />;
}
