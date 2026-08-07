import { auth } from "@app/auth";

import TemplateHome from "@app/components/templates/Home";
import TemplateDashboard from "@app/components/templates/Dashboard";
import WithdrawnNotice from "@app/components/molecules/WithdrawnNotice";

import { getAppIconUrl } from "@app/utils/appIcon";
import { serializeJsonLd } from "@app/utils/breadcrumb";

const description = "ポケカプレイヤーのための対戦記録サービス";

// 非会員向けのランディングにのみ出力する構造化データ。
// 検索エンジンにサービスの実体（サイト・アプリ・運営者）を伝える。
// 評価やレビューは実データを持たないため、意図的に含めていない。
function buildJsonLd(domain: string | undefined) {
  const url = `https://${domain}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: "バトレコ",
        description,
        inLanguage: "ja-JP",
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${url}/#webapp`,
        url,
        name: "バトレコ",
        description,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        inLanguage: "ja-JP",
        // ランディングで「完全無料・広告なし」を掲げているとおり、利用料は発生しない
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "JPY",
        },
        publisher: { "@id": `${url}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${url}/#organization`,
        url,
        name: "バトレコ",
        logo: {
          "@type": "ImageObject",
          url: new URL(getAppIconUrl(), url).toString(),
        },
        sameAs: ["https://x.com/vsrecorder_mobi"],
      },
    ],
  };
}

type Props = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function Home({ searchParams }: Props) {
  const session = await auth();

  if (session) {
    return <TemplateDashboard userId={session.user.id} />;
  }

  // 退会済みアカウントでサインインを試みた場合に /auth/error から転送されてくる
  const { notice } = await searchParams;

  const jsonLd = buildJsonLd(process.env.VSRECORDER_DOMAIN);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {notice === "withdrawn" && <WithdrawnNotice />}
      <TemplateHome />
    </>
  );
}
