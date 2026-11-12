"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  resolveTags,
  subscribeTagOverrides,
  tagOverridesVersion,
} from "@app/utils/tagOverrides";

/*
 * 応答に埋め込まれたタグへ、この端末で行った名前変更・削除を当てる関数を返す
 * (仕組みは utils/tagOverrides.ts)。
 *
 * タグを描く場所・件数や有無で出し分ける場所は、埋め込みの tags をそのまま使わず
 * これを通す。控えが変わると関数が新しくなり、使っている部品が描き直される。
 * サーバ描画とハイドレーションでは控えが空の扱い(0)なので、不一致は起きない。
 */
export function useTagResolver(): typeof resolveTags {
  const version = useSyncExternalStore(
    subscribeTagOverrides,
    tagOverridesVersion,
    () => 0,
  );

  // version が進むたびに別の関数にして、呼び出し側のメモ化もやり直させる
  // (resolveTags 自体は控えを直接読むので、中身は同じでよい)
  return useMemo<typeof resolveTags>(
    () => resolveTags.bind(null) as typeof resolveTags,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
}
