import { Suspense } from "react";
import { cookies } from "next/headers";

import { auth } from "@app/auth";

import TemplateHome from "@app/components/templates/Home";
import TemplateDashboard from "@app/components/templates/Dashboard";
import DashboardSkeleton from "@app/components/organisms/Dashboard/Skeleton/DashboardSkeleton";
import WithdrawnNotice from "@app/components/molecules/WithdrawnNotice";

import { getAppIconUrl } from "@app/utils/appIcon";
import { serializeJsonLd } from "@app/utils/breadcrumb";
import { SITE_DESCRIPTION } from "@app/utils/siteMeta";
import {
  DASHBOARD_LAYOUT_COOKIE,
  DEFAULT_DASHBOARD_LAYOUT,
  parseDashboardLayout,
} from "@app/utils/dashboardLayout";
import {
  EXCLUDE_DEFAULT_MATCHES_COOKIE,
  parseExcludeDefaultMatchesCookie,
} from "@app/utils/excludeDefaultMatches";

const description = SITE_DESCRIPTION;

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

  // スケルトンはこの分岐の内側に置く。ページ全体の loading.tsx にすると
  // セッションを見る前に表示が始まり、非会員のランディングでもダッシュボードの
  // スケルトンが一瞬映り込む。
  if (session) {
    // 骨格はこのユーザーのホームが前回描いた構成で出す。並べ替え・非表示の設定は
    // localStorage にあってサーバからは読めないため、実際に描いた並びを cookie 経由で受け取る
    // (DashboardSections が書く)。初回訪問など cookie が無ければ既定の並び。
    const store = await cookies();
    const storedLayout = parseDashboardLayout(store.get(DASHBOARD_LAYOUT_COOKIE)?.value);
    // 不戦勝・不戦敗を外すかも localStorage にあってサーバからは読めないため、
    // 同じ手で cookie から受け取る。渡さないと外している端末で最初の描画だけ
    // 既定(=外す)になり、トグルが一瞬有効に見えてから外れる
    const excludeDefaultMatches = parseExcludeDefaultMatchesCookie(
      store.get(EXCLUDE_DEFAULT_MATCHES_COOKIE)?.value,
    );

    return (
      <Suspense
        fallback={<DashboardSkeleton layout={storedLayout ?? DEFAULT_DASHBOARD_LAYOUT} />}
      >
        {/* ダッシュボード側にも渡す。表示設定を読むまでの繋ぎに同じ構成の骨格を出すため */}
        <TemplateDashboard
          userId={session.user.id}
          storedLayout={storedLayout ?? undefined}
          excludeDefaultMatches={excludeDefaultMatches ?? undefined}
        />
      </Suspense>
    );
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
