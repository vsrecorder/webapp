"use client";

import { useParams } from "next/navigation";

import CityleagueResultDetailSkeleton from "@app/components/organisms/Cityleague/Skeleton/CityleagueResultDetailSkeleton";

import { isDeckArchetypeEventId } from "@app/utils/deckArchetype";

/*
 * /cityleague_results/[id] の Suspense 境界。
 *
 * このアプリはルートレイアウト(TemplateLayout)が auth() を呼ぶため全ルートが動的で、
 * 動的ルートは loading.tsx が無いと <Link> のプリフェッチ対象から外れる。
 * つまりこのファイルが無いと、一覧や関連リンクからタップしてもサーバの描画が
 * 終わるまで画面が前のページのまま固まる。
 *
 * 骨格の中身は page.tsx の fallback と同じものを使う。
 *
 * 入賞カードのデッキの種類(バトラボのデッキ分類)の行は、分類が付く 2027 シーズン以降の大会だけ取る。
 * この時点ではまだ大会のシーズンが分からないので、URL の大会 ID で見分ける(isDeckArchetypeEventId)。
 * 以前は常に取っていて、旧シーズン(『30th CELEBRATION』環境より前)の大会では骨格にだけスプライトと
 * デッキ名の枠が出て、実体に差し替わるとカードが 1 枚あたり 100px 縮んでいた。
 * loading.tsx は props を受け取らないので、ID はクライアント側で URL から読む(useParams)。
 */
export default function Loading() {
  const { id } = useParams<{ id: string }>();

  return (
    <CityleagueResultDetailSkeleton
      withDeckArchetype={isDeckArchetypeEventId(Number(id))}
    />
  );
}
