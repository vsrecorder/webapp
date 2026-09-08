import CityleagueEventListSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueEventListSkeleton";

// Suspense 境界。索引から遷移した直後に即座にスケルトンを見せ、
// getCityleagueEventsInTerm（イベント全件＋期間内イベントの突き合わせ）の
// 完了を待つ間の「画面が固まって見える」体感を無くす。
//
// 索引側の loading.tsx は (index) グループに閉じてあるので、ここには継承されない。
// 索引側を直下(例: seasons/loading.tsx)へ戻すと、この骨格より先に索引の骨格が出る。
// 詳細側にこのファイルを置いても打ち消せない(2026-09-08 実測)ので、索引側を動かさないこと。
export default function Loading() {
  return <CityleagueEventListSkeleton />;
}
