import { cookies } from "next/headers";

import FixedTabBarSkeleton from "@app/components/molecules/Skeleton/FixedTabBarSkeleton";
import RecordCreateFormSkeleton from "@app/components/organisms/Record/Skeleton/RecordCreateFormSkeleton";
import {
  RECORD_CREATE_SELECTED_TAB_COOKIE,
  parseRecordCreateTab,
  DEFAULT_RECORD_CREATE_TAB,
} from "@app/utils/recordCreatePrefs";

/*
 * /records/create の Suspense 境界。実ページ(TemplateRecordCreate)と同じ
 * 「上部固定タブ＋入力フォーム」の枠を即座に見せ、サーバレンダリング待ちの間に
 * 画面が固まって見えるのを防ぐ。
 *
 * どのタブの骨格を出すかは実ページと同じく cookie から決める(recordCreatePrefs)。
 * ハードロードでは fallback はハイドレーションされないので、ここで読まないと
 * 自由形式・Tonamel を使う人にも公式イベントの形(検索欄とプレビューカード)が出て、
 * 実体に切り替わった瞬間にフォームが組み替わって見える。
 *
 * URL の event_type による名指しは反映できない(loading.tsx は searchParams を
 * 受け取れない)。その経路では保存済みのタブの骨格が出る。
 */
export default async function Loading() {
  const store = await cookies();
  const tab =
    parseRecordCreateTab(store.get(RECORD_CREATE_SELECTED_TAB_COOKIE)?.value) ??
    DEFAULT_RECORD_CREATE_TAB;

  return (
    <>
      {/* タブ(公式イベント/Tonamel/自由形式) */}
      <FixedTabBarSkeleton count={3} positionClassName="top-15 left-0 right-0" />

      <RecordCreateFormSkeleton tab={tab} />
    </>
  );
}
