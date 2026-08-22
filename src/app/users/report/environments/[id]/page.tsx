import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@app/auth";

import TemplateUserReport from "@app/components/templates/UserReport";
import { EnvironmentType } from "@app/types/environment";
import { fetchUpstream, upstreamUrl } from "@app/utils/upstream";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

// 環境の情報（名前・期間）はレポートの見出しにも一覧の表示にも要るため、描画前に確定させる。
// 環境そのものは公開データなので認証トークンは要らない。
async function getEnvironment(id: string): Promise<EnvironmentType | null> {
  try {
    return await fetchUpstream<EnvironmentType>(
      upstreamUrl`/api/v1beta/environments/${id}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const environment = await getEnvironment(id);

  return {
    title: environment
      ? `『${environment.title}』環境のバトルレポート`
      : "バトルレポート",
    // 本人の戦績だけを載せる非公開ページ
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

  const { id } = await params;
  const environment = await getEnvironment(id);
  if (!environment) {
    notFound();
  }

  // 期間を移動したときにカードや取得済みデータを持ち越さないよう、期間ごとに作り直す
  return (
    <TemplateUserReport
      key={environment.id}
      userId={session.user.id}
      period={{ kind: "environment", environment }}
    />
  );
}
