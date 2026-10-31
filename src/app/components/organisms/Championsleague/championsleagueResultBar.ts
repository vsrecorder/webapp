/*
 * チャンピオンズリーグ個別ページの先頭の固定バー(大会ページへ戻るリンク)の、PinnedBar に渡すクラス。
 * 実体(ChampionsleagueResultByLeague)と骨格(championsleagues/[id]/[league]/loading.tsx)で同じ値を使い、
 * 読み込み中 → 実体の切り替えで中身が動かないようにする。
 * 上の余白 pt-3 は、列が持っていた pt-1 とバーの py-2 を合わせたもの。戻るリンク自身が w-fit なので幅の指定は要らない。
 */
export const CHAMPIONSLEAGUE_RESULT_BAR_CLASS = "pt-3";
