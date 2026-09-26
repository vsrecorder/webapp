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
  toTermKey,
} from "@app/utils/cityleague";
import { OG_SIZE, renderCityleagueTermOgImage } from "@app/utils/ogImage";
import { splitAtBreakPoints } from "@app/utils/titleBreak";
import { ogImageUrlFor } from "@app/utils/ogStorage";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

async function findEnvironment(id: string): Promise<CityleagueTerm | undefined> {
  const environments = await getEnvironments();

  return environments.find((environment) => environment.id === id);
}

/*
 * 見出しの1行目「『環境名』環境の」。環境名が長いと1行に収まらない(26件中5件)。
 *   - 「環境の」は改行しないまとまりにする(「…環 / 境の」と語の途中で切れないように)
 *   - 「スカーレットex/バイオレットex」「スタートデッキ100 バトルコレクション」のように
 *     「/」や空白を含む名前はその後ろで改行し、各部分の途中では切らない
 *     (「サイバージャッ / ジ』」「コレクシ / ョン』」のようにならないように)
 */
function EnvironmentTitleLine({ title }: { title: string }) {
  // 改行してよい所(「/」の後ろ・空白)で区切る(区切り方は splitAtBreakPoints)。
  // 区切りの無い名前はまとまりにしない(1行に収まらないとはみ出してしまうため、幅に任せる)
  const segments = splitAtBreakPoints(title);
  const hasBreakPoints = segments.length > 1;

  return (
    <>
      『
      {segments.map((segment, index) =>
        typeof segment === "string" ? (
          segment
        ) : (
          <span key={index} className={hasBreakPoints ? "whitespace-nowrap" : undefined}>
            {segment.text}
          </span>
        ),
      )}
      』<span className="whitespace-nowrap">環境の</span>
    </>
  );
}

// 見出しは「の」の後ろで改行して見せる(CityleagueHubHeader の titleLines)。
// 1行のタイトル(<title>・OGP)は各行をつないだもの
function buildTitleLines(environment: CityleagueTerm): string[] {
  return [`『${environment.title}』環境の`, "シティリーグ入賞デッキ一覧"];
}

function buildTitle(environment: CityleagueTerm): string {
  return buildTitleLines(environment).join("");
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

  const ogImageUrl = ogImageUrlFor(
    `cityleague_results/environments/${environment.id}-${toTermKey(environment)}`,
    () => renderCityleagueTermOgImage(`『${environment.title}』環境`, environment),
  );

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
      images: ogImageUrl ? [{ url: ogImageUrl, ...OG_SIZE, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: "@vsrecorder_mobi",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
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
          // 1行目は環境名が長いと折り返すので、切れ目を選んだ要素で渡す(EnvironmentTitleLine)
          titleLines={[
            <EnvironmentTitleLine key="environment" title={environment.title} />,
            buildTitleLines(environment)[1],
          ]}
          subtitle={formatTermRange(environment)}
          count={events.length}
        />

        <CityleagueEventLinkList events={events} />
      </div>
    </>
  );
}
