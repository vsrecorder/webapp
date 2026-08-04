import { useEffect } from "react";

/*
 * 戻る/進む(履歴移動)でページを表示したとき、必ずページ先頭から表示する。
 *
 * 直す対象の不具合:
 *   ホームなどへ戻ったときに、離脱時とも先頭とも違う「ページの途中」が表示される。
 *
 * 原因:
 *   ブラウザは戻る操作のとき、そのページを離れたときのスクロール位置を復元しようとする。
 *   ところがこのアプリのページは、バッジ・戦績・カレンダー・一覧などを
 *   クライアント側で取得してから高さが確定するため、戻った直後の文書は
 *   離脱時よりずっと短い。その状態で復元されると位置がスクロール上限まで
 *   切り詰められ、さらにその後データが届いて高さが伸びると、ブラウザの
 *   スクロールアンカリングが働いて、切り詰められた位置を起点に別の場所へずれる。
 *
 *   実測(ホーム相当のページ, 離脱時 y=1800 / 高さ4952):
 *     戻った直後  y=1420  h=2264 (各パネルが取得前で縮んでいる → 上限で切り詰め)
 *     600ms後     y=3212  h=4952 (伸びた分をアンカリングが追いかけてずれる)
 *
 * 対応:
 *   ブラウザ任せの復元では「コンテンツが揃うまで待つ」制御ができないため、
 *   scrollRestoration を manual にして復元自体を止め、履歴移動では先頭を表示する。
 *   manual にするだけでは直前のページのスクロール位置がそのまま残るので、
 *   popstate で明示的に先頭へ戻す。
 *
 * 例外:
 *   ページ内リンク(#付き)のURLへ戻った場合は、先頭ではなくその位置へ移動する。
 *   ただし別ページから戻ってきた直後は移動先がまだ描画されていないため、
 *   見つからない場合は先頭に倒す(前ページの位置を持ち込まないことを優先する)。
 *
 * 既存の位置復元との関係:
 *   一覧からモーダル/詳細へ入って戻る導線には、対象カードまで移動する個別の復元処理が
 *   各ページにある(記録一覧の scrollToCard、大会結果の scrollToId など)。
 *   いずれも対象の描画を待ってから走るため、この先頭リセットより後になり、上書きされない。
 */
export function useScrollResetOnHistoryNavigation() {
  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    // 不正なエスケープを含むハッシュは decodeURIComponent が投げるため、その場合は素のまま扱う
    const decodeHash = (raw: string): string => {
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    };

    const handlePopState = () => {
      const hash = window.location.hash;

      if (hash.length > 1) {
        const target = document.getElementById(decodeHash(hash.slice(1)));
        if (target) {
          target.scrollIntoView();
          return;
        }
      }

      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.history.scrollRestoration = previous;
    };
  }, []);
}
