import { auth } from "@app/auth";

import TemplateHome from "@app/components/templates/Home";
import TemplateDashboard from "@app/components/templates/Dashboard";

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

export default async function Home() {
  const session = await auth();

  if (session) {
    return <TemplateDashboard userId={session.user.id} />;
  }

  const jsonLd = buildJsonLd(process.env.VSRECORDER_DOMAIN);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <TemplateHome />
    </>
  );
}
