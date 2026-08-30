import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@app/auth";

import TemplateUserReport from "@app/components/templates/UserReport";
import { isValidWeekValue, weekRangeLabel } from "@app/utils/week";

type Props = {
  params: Promise<{
    // 週の月曜日 "YYYY-MM-DD"（core-api の week パラメータと同じ形式）
    week: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { week } = await params;

  return {
    title: isValidWeekValue(week)
      ? `${weekRangeLabel(week)}の週のバトルレポート`
      : "バトルレポート",
    // 本人の戦績だけを載せる非公開ページ。週ごとにURLが増えるため明示的に検索対象から外す
    robots: {
      index: false,
      follow: false,
    },
  };
}

// 週次のバトルレポート（施策P-2「記録の配当」の着地先）。
// 毎週月曜の通知 /users/report/weeks/{先週の月曜} から入ってくる。
export default async function Page({ params }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { week } = await params;
  // 月曜以外や存在しない日付でAPIを叩きに行かせない。
  // 月曜に正規化して受け入れると同じ週に7つのURLができるため、正規形だけを許す。
  if (!isValidWeekValue(week)) {
    notFound();
  }

  // 期間を移動したときにカードや取得済みデータを持ち越さないよう、期間ごとに作り直す
  return (
    <TemplateUserReport key={week} userId={session.user.id} period={{ kind: "week", week }} />
  );
}
