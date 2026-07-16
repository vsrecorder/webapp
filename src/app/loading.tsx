import { Card, CardBody, Skeleton } from "@heroui/react";

// ルートセグメントの Suspense 境界。
// トップページ(ログイン後はダッシュボード)は複数のバックエンド取得を挟むため
// サーバレンダリングに時間がかかる。独自の loading を持たない動的ページ全体の
// フォールバックも兼ね、遷移直後に「画面が固まって見える」体感を無くすための
// ニュートラルなページスケルトンを表示する。
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-6xl xl:max-w-7xl pt-3 lg:pt-9">
      <div className="flex flex-col gap-4">
        {/* ヘッダー相当（プロフィールカードなど） */}
        <Card shadow="sm" className="w-full">
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
          </CardBody>
        </Card>

        {/* コンテンツセクション相当（見出し＋カード） */}
        {Array.from({ length: 3 }).map((_, i) => (
          <section key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Card shadow="sm" className="w-full">
              <CardBody className="flex flex-col gap-3 p-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-3 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </CardBody>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
