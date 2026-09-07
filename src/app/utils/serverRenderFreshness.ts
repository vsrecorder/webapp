"use client";

import { useState } from "react";

/*
 * サーバ描画の結果が「いま取られたもの」か「使い回されたもの」かの判定。
 *
 * ブラウザの「戻る」では、動的なページでもサーバ描画の結果(RSC)がそのまま再利用され、
 * サーバは再実行されない(実測で確認)。そのためページが渡してくる初期データは、
 * 戻ってきた場合に限って古い。区別できないと「毎回取り直す(通信が増える)」か
 * 「取り直さない(古いまま見える)」かのどちらかに倒すしかない。
 *
 * サーバ描画ごとに一意な id を振っておき、この文書で初めて見る id なら「いま取られたもの」、
 * 一度使った id が再び来たら「使い回し」と判定する。id はサーバ描画の結果に含まれるので、
 * 使い回されれば同じ id が返ってくる。時計のずれに依存しない。
 */

export type RenderIdTracker = {
  // 初めて見る id なら true。一度使った id・id 無しなら false
  consume: (renderId: string | undefined) => boolean;
};

// 覚えておく id の数。超えたら古いものから落とす。1文書でこの回数の遷移を挟むことは
// 実際には起きないが、長時間開きっぱなしでも際限なく増えないようにしておく
const DEFAULT_MAX_ENTRIES = 500;

export function createRenderIdTracker(maxEntries = DEFAULT_MAX_ENTRIES): RenderIdTracker {
  const consumed = new Set<string>();

  return {
    consume(renderId) {
      // id が無い(サーバ描画を経ていない・古い版のページ)ときは、新しいと言い切れないので
      // 取り直す側へ倒す
      if (!renderId) return false;
      if (consumed.has(renderId)) return false;

      consumed.add(renderId);

      if (consumed.size > maxEntries) {
        const oldest = consumed.values().next();
        if (!oldest.done) consumed.delete(oldest.value);
      }

      return true;
    },
  };
}

const defaultTracker = createRenderIdTracker();

/*
 * このマウントで受け取ったサーバ描画の結果が、いま取られたものか。
 * マウントごとに一度だけ判定する(同じ id で二度目のマウントなら false)。
 */
export function useIsFreshServerRender(renderId: string | undefined): boolean {
  const [isFresh] = useState(() =>
    // サーバ描画中は、いま作ったばかりの結果なので必ず「新しい」。
    // ここで記録すると、プロセスを共有する全リクエストぶんの id が積み上がるだけで意味がない
    // (ハイドレーション時にクライアント側で改めて記録するので、判定は食い違わない)
    typeof window === "undefined" ? true : defaultTracker.consume(renderId),
  );

  return isFresh;
}
