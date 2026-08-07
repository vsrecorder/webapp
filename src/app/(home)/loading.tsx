import { Card, CardBody, Skeleton } from "@heroui/react";

import UserProfileCardSkeleton from "@app/components/organisms/User/Skeleton/UserProfileCardSkeleton";
import { isDevEnv } from "@app/utils/appIcon";

// トップページ("/")専用の Suspense 境界。
// トップページ(ログイン後はダッシュボード)は複数のバックエンド取得を挟むため
// サーバレンダリングに時間がかかる。遷移直後に「画面が固まって見える」体感を
// 無くすためのページスケルトンを表示する。
//
// このファイルは (home) ルートグループの中に置いてある。app/loading.tsx として
// ルート直下に置くと、独自の loading を持たない全ページ(利用規約・プライバシー
// ポリシーなど)の遷移フォールバックにも使われ、無関係なページでダッシュボードの
// スケルトンが一瞬映り込む。ルートグループは URL に影響しないので、"/" だけに
// この境界を効かせるためにこの階層へ隔離している。
//
// 先頭のプロフィールカードだけは実物と同じ骨格・同じ高さのスケルトンを使う。
// ダッシュボードで最初に目に入る要素であり、形が違うと差し替わった瞬間に
// 見た目が飛んでしまうため(以降のセクションは中身が可変なのでニュートラルなまま)。
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl lg:max-w-6xl xl:max-w-7xl pt-3 lg:pt-9">
      {/* 節の間隔は DashboardSections(mb-3 lg:mb-6)に合わせる */}
      <div className="flex flex-col gap-3 lg:gap-6">
        <UserProfileCardSkeleton isDevEnv={isDevEnv()} />

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
