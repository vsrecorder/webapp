import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@app/auth";

import TemplateUserReport from "@app/components/templates/UserReport";
import { isValidYearMonth, yearMonthLabel } from "@app/utils/yearMonth";

type Props = {
  params: Promise<{
    yearMonth: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { yearMonth } = await params;

  return {
    title: isValidYearMonth(yearMonth)
      ? `${yearMonthLabel(yearMonth)}のバトルレポート`
      : "バトルレポート",
    // 本人の戦績だけを載せる非公開ページ。期間ごとにURLが増えるため明示的に検索対象から外す
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page({ params }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { yearMonth } = await params;
  // "2026-13" のような値でAPIを叩きに行かせない
  if (!isValidYearMonth(yearMonth)) {
    notFound();
  }

  // 期間を移動したときにカードや取得済みデータを持ち越さないよう、期間ごとに作り直す
  return (
    <TemplateUserReport
      key={yearMonth}
      userId={session.user.id}
      period={{ kind: "month", yearMonth }}
    />
  );
}
