"use client";

import { writeSessionStorage } from "@app/utils/sessionStorageStore";

/*
 * 「戻ってきたら開き直す/スクロールする」対象(sessionStorage)を、別のページへ進む直前に書く。
 *
 * 対象を読む一覧やカードは、値を描画中に購読している(useSessionStorageItem)。進む直前に
 * 普通に書くと、遷移が終わるまで画面に残っている「元の」一覧がその場で受け取り、開き直して
 * 対象を消してしまう。進んだ先にも戻ってきた一覧にも何も残らず、戻っても元の状態に
 * ならなかった(2026-09-08 に描画中に購読する形へ変えてから。2026-10-08 に報告)。
 *
 * そこで、この関数で書いた順番をキーごとに控えておき、読み手(useReturnTargetItem)は
 * 「自分が現れた後に、この関数で書かれた値」だけを無視する。戻ってきて新しく現れた読み手は
 * 普通に受け取る。記録詳細ページが離れるときに書き戻す値のような、普通の書き込み
 * (writeSessionStorage)には従来どおりその場で追随する。
 *
 * 控えはモジュールの変数なので、ページを読み込み直すと消える(読み手もすべて新しくなるので問題ない)。
 */

let markSequence = 0;
const markedAt = new Map<string, number>();

// 進む直前に対象を書く。null で消すのは普通の writeSessionStorage でよい
export function writeReturnTarget(key: string, value: string): void {
  markSequence += 1;
  markedAt.set(key, markSequence);
  writeSessionStorage(key, value);
}

// 今の書き込みの番号。読み手が現れた時点の値を控えるのに使う
export function currentReturnTargetSequence(): number {
  return markSequence;
}

// key が、sequence の時点より後にこの関数で書かれたか
export function isReturnTargetMarkedAfter(key: string, sequence: number): boolean {
  return (markedAt.get(key) ?? 0) > sequence;
}

/*
 * 戻ってきたときに「元の位置」へ戻すための、離れる直前のカードの画面上の高さ。
 *
 * 以前は戻ったとき対象カードを固定の位置(ヘッダーのすぐ下)へ合わせていたため、画面の
 * 途中にあったカードを開いて戻ると、見ていた位置からずれて見えた。スクロール量そのもの
 * ではなくカードの画面上の高さを覚えるのは、戻ったときに上側の中身が変わっていても
 * (シティリーグの新着の差し込みなど)そのカードを同じ高さに置けるようにするため。
 *
 * モーダルを開いている間は背面が position:fixed で固定されるが、見た目の位置は変わらないので
 * getBoundingClientRect の top はそのまま使える。
 */
const ANCHOR_TOP_PREFIX = "returnAnchorTop:";

// 同じ id のカードが隠れたタブ側にもあることがあるので、見えている方を使う
function findVisibleAnchor(anchorId: string, root: ParentNode = document): HTMLElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLElement>(`[id="${anchorId}"]`)).find(
      (el) => el.getBoundingClientRect().width > 0,
    ) ?? null
  );
}

// 別のページへ進む直前に、目印のカードの画面上の高さを覚える(見つからなければ何もしない)
export function saveReturnAnchorTop(anchorId: string): void {
  const el = findVisibleAnchor(anchorId);

  try {
    // 見つからなければ前回のぶんを消す(古い高さで戻さない)
    if (!el) sessionStorage.removeItem(ANCHOR_TOP_PREFIX + anchorId);
    else sessionStorage.setItem(ANCHOR_TOP_PREFIX + anchorId, String(el.getBoundingClientRect().top));
  } catch {
    // 保存できない環境では、戻ったときに既定の位置へ合わせるだけ
  }
}

/*
 * 覚えた高さ。無ければ null。
 *
 * 読んでも消さない。デッキ一覧のように1回の戻りで位置合わせが2か所(一覧とカード)から
 * 呼ばれることがあり、先に読んだ側が消すと後の側が既定の位置で上書きしてしまう。
 * 次に進むときに saveReturnAnchorTop が書き直す。
 */
function readReturnAnchorTop(anchorId: string): number | null {
  try {
    const raw = sessionStorage.getItem(ANCHOR_TOP_PREFIX + anchorId);
    const top = raw === null ? NaN : Number(raw);
    return Number.isFinite(top) ? top : null;
  } catch {
    return null;
  }
}

/*
 * 戻ってきたとき、目印のカードを離れる直前と同じ画面上の高さへ移動する。
 * 覚えた高さが無ければ fallbackTop(画面上端からの距離)に合わせる。
 *
 * container を渡すとその要素をスクロールする(モーダルの中の一覧)。高さは画面基準で
 * 覚えているので、どちらも「今の高さとの差だけ動かす」で同じように戻せる。
 * 瞬間移動にする(モーダルが開くと背面がその時点の位置で固定されるため)。
 * 目印が見つからなければ false。
 */
export function scrollBackToAnchor(
  anchorId: string,
  fallbackTop: number,
  options: { root?: ParentNode; container?: HTMLElement | null } = {},
): boolean {
  const el = findVisibleAnchor(anchorId, options.root);
  if (!el) return false;

  const targetTop = readReturnAnchorTop(anchorId) ?? fallbackTop;
  const delta = el.getBoundingClientRect().top - targetTop;

  if (options.container) {
    options.container.scrollTo({
      top: Math.max(0, options.container.scrollTop + delta),
      behavior: "auto",
    });
  } else {
    window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "auto" });
  }

  return true;
}
