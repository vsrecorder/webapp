import CityleagueEventListSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventListSkeleton";

// Suspense 境界。索引から遷移した直後に即座にスケルトンを見せ、
// getCityleagueEventsInTerm（イベント全件＋期間内イベントの突き合わせ）の
// 完了を待つ間の「画面が固まって見える」体感を無くす。
//
// 索引側（例: seasons/loading.tsx）は1つ上のセグメントに置くため、これが無いと
// 詳細ページにも索引の骨格が出てしまう。中身に合わせてここで上書きする。
export default function Loading() {
  return <CityleagueEventListSkeleton />;
}
