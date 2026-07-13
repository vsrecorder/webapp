type Crumb = {
  name: string;
  path: string;
};

// パンくずの構造化データ。検索結果にサイト内の階層が出るようになり、
// 個別イベントページまでの導線が Google に伝わる。
export function buildBreadcrumbJsonLd(crumbs: Crumb[]) {
  const origin = `https://${process.env.VSRECORDER_DOMAIN}`;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path}`,
    })),
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
