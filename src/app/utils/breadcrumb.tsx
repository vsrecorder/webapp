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

// 構造化データを<script>に埋め込む。
// JSON.stringify は "<" をエスケープしないため、値に "</script>" が含まれると
// そこでタグが閉じてしまい、以降が本物のスクリプトとして実行される。
// イベント名や店舗名など上流由来の文字列を埋めているので、"<" は必ず潰しておく。
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
