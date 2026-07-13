import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";
import CityleagueHubHeader from "@app/components/organisms/Cityleague/CityleagueHubHeader";

import { buildBreadcrumbJsonLd, JsonLd } from "@app/utils/breadcrumb";
import {
  CityleagueTerm,
  formatTermRange,
  getCityleagueEventsInTerm,
  getEnvironments,
} from "@app/utils/cityleague";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

async function findEnvironment(id: string): Promise<CityleagueTerm | undefined> {
  const environments = await getEnvironments();

  return environments.find((environment) => environment.id === id);
}

function buildTitle(environment: CityleagueTerm): string {
  return `『${environment.title}』環境のシティリーグ結果・優勝デッキ一覧`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const environment = await findEnvironment(id);

  if (!environment) {
    return { title: "シティリーグ結果" };
  }

  const title = buildTitle(environment);
  const description = `『${environment.title}』環境（${formatTermRange(environment)}）に開催されたシティリーグの結果一覧です。この環境で勝ち残ったデッキの傾向を、優勝からベスト16までのデッキコードで確認できます。`;
  const path = `/cityleague_results/environments/${environment.id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      url: path,
      type: "website",
      title,
      description,
      locale: "ja_JP",
      siteName: "バトレコ",
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const environment = await findEnvironment(id);

  if (!environment) {
    notFound();
  }

  const events = await getCityleagueEventsInTerm(
    environment.from_date,
    environment.to_date,
  );

  const jsonLd = buildBreadcrumbJsonLd([
    { name: "バトレコ", path: "/" },
    { name: "シティリーグ結果", path: "/cityleague_results" },
    { name: "環境から探す", path: "/cityleague_results/environments" },
    {
      name: `『${environment.title}』環境`,
      path: `/cityleague_results/environments/${environment.id}`,
    },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-3 pt-4 pb-8">
        <CityleagueHubHeader
          backHref="/cityleague_results/environments"
          backLabel="環境から探す"
          eyebrow="ENVIRONMENT"
          title={buildTitle(environment)}
          subtitle={formatTermRange(environment)}
          count={events.length}
        />

        <CityleagueEventLinkList events={events} />
      </div>
    </>
  );
}
