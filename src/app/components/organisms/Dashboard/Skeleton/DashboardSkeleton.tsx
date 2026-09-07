import DashboardBlockSkeleton from "@app/components/organisms/Dashboard/Skeleton/DashboardSectionSkeletons";
import { isDevEnv } from "@app/utils/appIcon";
import {
  DashboardBlockId,
  DEFAULT_DASHBOARD_LAYOUT,
  splitDashboardLayout,
} from "@app/utils/dashboardLayout";

/*
 * ダッシュボード(ログイン時のトップページ)の取得待ちに出すスケルトン。
 * 複数のバックエンド取得を挟むためサーバレンダリングに時間がかかるので、
 * 「画面が固まって見える」体感を無くすために表示する。
 *
 * loading.tsx ではなく通常のコンポーネントとして持ち、ダッシュボードを描く側で
 * Suspense に渡す。loading.tsx にするとセッションの有無が分かる前に表示が始まり、
 * 非ログイン時のランディングでもこのスケルトンが一瞬映り込んでしまう。
 *
 * 並び(layout)は「前回このユーザーのホームが実際に描いた構成」で、page.tsx が cookie から
 * 読んで渡す(utils/dashboardLayout)。パネルは並べ替え・非表示をユーザーが設定でき、
 * その設定は localStorage にあってサーバからは読めないため、cookie を経由しないと
 * 全員に同じ形しか出せない。cookie が無い初回訪問では既定の並びを使う。
 *
 * 各ブロックの中身は、そのパネル自身が読み込み中に出している骨格をそのまま使い回す
 * (DashboardSectionSkeletons)。実物と同じ寸法・同じ余白になるので、差し替わった瞬間に
 * 見た目が飛ばない。
 */

type Props = {
  layout?: readonly DashboardBlockId[];
};

export default function DashboardSkeleton({
  layout = DEFAULT_DASHBOARD_LAYOUT,
}: Props) {
  const { pinned, sections, trailing } = splitDashboardLayout(layout);
  const devEnv = isDevEnv();

  return (
    <div className="pt-3 lg:pt-9 xl:pt-9 max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto w-full">
      {/* 器の作り(pinned / 多段組 / trailing の間隔)は DashboardSections に合わせる */}
      {pinned.length > 0 && (
        <div className="mb-3 lg:mb-6 lg:break-inside-avoid-column">
          <div className="flex flex-col gap-3 lg:gap-6">
            {pinned.map((id) => (
              <DashboardBlockSkeleton key={id} id={id} isDevEnv={devEnv} />
            ))}
          </div>
        </div>
      )}

      <div className="lg:columns-2 lg:gap-6">
        {sections.map((id) => (
          <div key={id} className="mb-3 lg:mb-6 lg:break-inside-avoid-column">
            <DashboardBlockSkeleton id={id} isDevEnv={devEnv} />
          </div>
        ))}
      </div>

      {trailing.map((id) => (
        <div key={id} className="mt-3 lg:mt-6 lg:break-inside-avoid-column">
          <DashboardBlockSkeleton id={id} isDevEnv={devEnv} />
        </div>
      ))}
    </div>
  );
}
