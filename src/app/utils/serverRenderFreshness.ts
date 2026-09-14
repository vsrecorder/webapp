"use client";

import { useEffect, useState } from "react";

/*
 * サーバ描画の結果が「いま取られたもの」か「使い回されたもの」かの判定。
 *
 * ブラウザの「戻る」では、動的なページでもサーバ描画の結果(RSC)がそのまま再利用され、
 * サーバは再実行されない(実測で確認)。そのためページが渡してくる初期データは、
 * 戻ってきた場合に限って古い。区別できないと「毎回取り直す(通信が増える)」か
 * 「取り直さない(古いまま見える)」かのどちらかに倒すしかない。
 *
 * サーバ描画ごとに一意な id を振っておき、この文書で初めて使う id なら「いま取られたもの」、
 * 一度使った id が再び来たら「使い回し」と判定する。id はサーバ描画の結果に含まれるので、
 * 使い回されれば同じ id が返ってくる。時計のずれに依存しない。
 *
 * 「使った」と記録するのは画面が確定(コミット)したときだけで、描画中は記録を読むだけにする。
 * React は描画を途中で捨てて作り直すことがあり(サスペンドからの再開など)、そのとき
 * useState の初期化子はもう一度走る。描画中に記録してしまうと、作り直しのたびに
 * 「二度目だから使い回し」と答えが反転する。サーバ描画は常に「新しい」を返すので、
 * その反転はそのままハイドレーションの不一致になる(デッキ一覧の「更に読み込む」で実際に出ていた)。
 * 読むだけにしておけば、何度作り直されても答えは変わらない。
 * 確定しなかった描画が記録を進めないのも都合がよい。その画面は表示されていないので、
 * 次に同じ id で開かれたときは「初めて」として扱うのが正しい。
 */

export type RenderIdTracker = {
  // この id を使った画面がまだ確定していなければ true。id 無しは false。
  // 描画中に呼ぶので、記録は変えない
  isUnused: (renderId: string | undefined) => boolean;
  // 画面が確定したときに呼ぶ。以降この id は「使い回し」と判定される
  markUsed: (renderId: string | undefined) => void;
};

// 覚えておく id の数。超えたら古いものから落とす。1文書でこの回数の遷移を挟むことは
// 実際には起きないが、長時間開きっぱなしでも際限なく増えないようにしておく
const DEFAULT_MAX_ENTRIES = 500;

export function createRenderIdTracker(maxEntries = DEFAULT_MAX_ENTRIES): RenderIdTracker {
  const used = new Set<string>();

  return {
    isUnused(renderId) {
      // id が無い(サーバ描画を経ていない・古い版のページ)ときは、新しいと言い切れないので
      // 取り直す側へ倒す
      if (!renderId) return false;

      return !used.has(renderId);
    },

    markUsed(renderId) {
      if (!renderId || used.has(renderId)) return;

      used.add(renderId);

      if (used.size > maxEntries) {
        const oldest = used.values().next();
        if (!oldest.done) used.delete(oldest.value);
      }
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
    // (ハイドレーション後にクライアント側で改めて記録するので、判定は食い違わない)
    typeof window === "undefined" ? true : defaultTracker.isUnused(renderId),
  );

  // 画面が確定した時点で「使った」と記録する。これ以降、同じ id で開き直された画面は
  // 「使い回し」と判定される(戻る操作で取り直すための本来の動き)
  useEffect(() => {
    defaultTracker.markUsed(renderId);
  }, [renderId]);

  return isFresh;
}
