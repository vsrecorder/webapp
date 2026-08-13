import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isModalHistoryPop } from "@app/utils/modalHistory";

/*
 * ページを表示したとき、必ずページ先頭から表示する。
 * 対象は「戻る/進む(履歴移動)」と「リンクによるページ遷移」の両方。
 *
 * 例外はリロードで、こちらは直前の位置を復元する(長い一覧を見ている途中で
 * 引っ張って更新したときに先頭へ飛ばされないようにするため)。
 * 詳細は後半の startReloadRestore のコメントを参照。
 *
 * --- 履歴移動(戻る/進む) ---
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
 * --- リンク遷移 ---
 *
 * 直す対象の不具合:
 *   ホームだけ、別のページのスクロール位置を引きずったまま表示される。
 *
 * 原因:
 *   App Router は遷移のたびにページ先頭へスクロールし直すが、その判定は
 *   「新しいページの先頭要素の上端がビューポート内にあるなら、もう先頭が見えている
 *   ので何もしない」というもの。ホーム(ダッシュボード)は表示までにサーバ側で複数の
 *   取得を挟むため、遷移の瞬間に loading.tsx のフォールバック(高さ1画面ぶん)だけの
 *   状態を必ず経由する。このとき文書が1画面まで縮み、前のページのスクロール位置が
 *   スクロール上限へ切り詰められる。切り詰められた結果、先頭要素の上端がビューポート内へ
 *   入ってしまい、App Router は「もう先頭が見えている」と誤って判断してスクロールしない。
 *
 *   実測(/terms で y=1500 → ホームへ遷移, ビューポート高 844):
 *      63ms  y=  28  h= 872 (フォールバックのみ。1500が上限28へ切り詰め → 先頭要素top=28)
 *     438ms  y=1500  h=5845 (本体が届いて伸び、ブラウザが切り詰め前の1500を復元)
 *
 *   スクロールの処理は1遷移につき1回きりなので、後から文書が伸びても処理し直されない。
 *   フォールバックが実ページ相当の高さを持つ他ページ(記録一覧・デッキ一覧など)では
 *   切り詰めが起きないため、この不具合はホームだけに現れる。
 *
 * 対応:
 *   フォールバックの高さに結果が左右されないよう、pathname が変わったら自前で先頭へ戻す。
 *
 * 例外:
 *   ページ内リンク(#付き)のURLへ移動した場合は、先頭ではなくその位置へ移動する。
 *   ただし履歴移動で別ページから戻ってきた直後は移動先がまだ描画されていないため、
 *   見つからない場合は先頭に倒す(前ページの位置を持ち込まないことを優先する)。
 *
 * 既存の位置復元との関係:
 *   一覧からモーダル/詳細へ入って戻る導線には、対象カードまで移動する個別の復元処理が
 *   各ページにある(記録一覧の scrollToCard、大会結果の scrollToId など)。
 *   いずれも対象の描画を待ってから走るため、この先頭リセットより後になり、上書きされない。
 */
// リロード直前のスクロール位置の保存先。
// タブを閉じれば消えてほしいので localStorage ではなく sessionStorage を使う。
const RELOAD_SCROLL_KEY = "vsrecorder:scroll-before-unload";

// 復元を諦めるまでの時間。この間に文書が目的の高さまで伸びなければ、
// 届いたところまでで打ち切る(伸びないページを延々と監視し続けないため)。
const RELOAD_RESTORE_TIMEOUT_MS = 3000;

// 文書の高さが何フレーム変わらなければ「伸びきった」とみなすか。
// 目的地に着いた時点で監視をやめると、その後の伸長でスクロールアンカリングが
// 働いて位置がずれるため、高さが落ち着くまで当て直しを続ける。
const RELOAD_RESTORE_STABLE_FRAMES = 10;

type SavedScroll = {
  href: string;
  y: number;
};

// sessionStorage はプライベートモードや容量超過で例外を投げることがある。
// スクロール位置は失っても実害が無いので、失敗は握りつぶす。
function readSavedScroll(): SavedScroll | null {
  try {
    const raw = sessionStorage.getItem(RELOAD_SCROLL_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as SavedScroll).href === "string" &&
      typeof (parsed as SavedScroll).y === "number"
    ) {
      return parsed as SavedScroll;
    }
  } catch {
    // 無視
  }
  return null;
}

function saveScroll() {
  try {
    const value: SavedScroll = { href: window.location.href, y: window.scrollY };
    sessionStorage.setItem(RELOAD_SCROLL_KEY, JSON.stringify(value));
  } catch {
    // 無視
  }
}

// 今回の読み込みがリロードだったか。
// 戻る/進むによる文書の再読み込み("back_forward")とは区別する必要がある
// (そちらは従来どおり先頭に倒す)。
function isReloadNavigation(): boolean {
  const entries = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  return entries[0]?.type === "reload";
}

/*
 * リロード時にスクロール位置を復元する。
 *
 * scrollRestoration を manual にしたままブラウザ任せにしないのは、履歴移動と同じ
 * 「復元しようとした時点では文書が短く、位置が上限で切り詰められ、その後データが
 * 届いて伸びるとアンカリングでずれる」問題がリロードでも起きるため。
 * ここでは文書が伸びるのを追いかけながら、目的の位置に届くまで復元し直す。
 *
 * 途中でユーザーが自分でスクロールしたら、そちらを優先して即座に打ち切る。
 */
function startReloadRestore(targetY: number): () => void {
  const deadline = Date.now() + RELOAD_RESTORE_TIMEOUT_MS;
  const userEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

  let rafId = 0;
  let stopped = false;
  let lastHeight = -1;
  let stableFrames = 0;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(rafId);
    for (const type of userEvents) window.removeEventListener(type, stop);
  };

  for (const type of userEvents) {
    window.addEventListener(type, stop, { passive: true });
  }

  const step = () => {
    if (stopped) return;

    // 文書の高さが変わったときだけ当て直す（毎フレームの scrollTo を避ける）
    const height = document.documentElement.scrollHeight;
    if (height !== lastHeight) {
      lastHeight = height;
      stableFrames = 0;
      const maxY = Math.max(0, height - window.innerHeight);
      window.scrollTo({ top: Math.min(targetY, maxY), left: 0, behavior: "instant" });
    } else {
      stableFrames++;
    }

    // 高さが落ち着き、かつ目的地に届いていれば終了。時間切れでも終了。
    const reached = Math.round(window.scrollY) >= Math.round(targetY);
    if (
      (reached && stableFrames >= RELOAD_RESTORE_STABLE_FRAMES) ||
      Date.now() > deadline
    ) {
      stop();
      return;
    }

    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);

  return stop;
}

export function useScrollResetOnNavigation() {
  const pathname = usePathname();

  // リロード復元を走らせた初回だけ、リンク遷移用の先頭リセットを見送るための目印。
  const skipInitialResetRef = useRef(false);

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

    const handlePopState = (event: PopStateEvent) => {
      // モーダルを閉じるためのバックと、閉じたあとに戻り先を取り除く巻き戻し
      // (useCloseModalOnBack)はページ遷移ではない。ここで先頭へ戻すと、
      // モーダルを閉じただけで背面が勝手に先頭へ飛んでしまう
      if (isModalHistoryPop(event)) return;

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

    /*
     * リロード用の保存。
     *
     * pagehide はモバイルで beforeunload より確実に呼ばれる。ただし iOS では
     * アプリ切り替えなどで pagehide を経ずに破棄されることがあるため、
     * 非表示になった時点でも保存しておく。
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveScroll();
    };

    window.addEventListener("pagehide", saveScroll);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // リロードのときだけ、保存しておいた位置へ戻す。
    // URL が一致しない場合(別ページを開き直した等)は持ち込まない。
    let stopRestore: (() => void) | null = null;
    if (isReloadNavigation()) {
      const saved = readSavedScroll();
      if (saved && saved.href === window.location.href && saved.y > 0) {
        skipInitialResetRef.current = true;
        stopRestore = startReloadRestore(saved.y);
      }
    }

    return () => {
      stopRestore?.();
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pagehide", saveScroll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.history.scrollRestoration = previous;
    };
  }, []);

  // リンク遷移。ページが変わった最初の描画で先頭へ戻す。
  // ハッシュ付きのURLへ移動したときは、その移動先(App Router が処理する)を優先して何もしない。
  useEffect(() => {
    // リロード復元中はその位置を尊重する。見送るのは初回の1回だけ。
    if (skipInitialResetRef.current) {
      skipInitialResetRef.current = false;
      return;
    }

    if (window.location.hash.length > 1) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
}
