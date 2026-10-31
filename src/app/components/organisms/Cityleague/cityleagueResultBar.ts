/*
 * シティリーグ個別ページの先頭の固定バー(戻るリンク＋シェア)の、PinnedBar に渡すクラス。
 * 実体(CityleagueResultByOfficialEventId)と骨格(CityleagueResultDetailSkeleton)で同じ値を使い、
 * 読み込み中 → 実体の切り替えで中身が動かないようにする。
 * 上の余白 pt-3 は、列が持っていた pt-1 とバーの py-2 を合わせたもの(列の先頭にバーが来るので列側は持たない)。
 */
export const CITYLEAGUE_RESULT_BAR_CLASS = "flex items-center justify-between gap-2 pt-3";
