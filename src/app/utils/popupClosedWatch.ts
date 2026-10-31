/*
 * window.open で開いたポップアップが閉じられたことを見張る。
 *
 * Firebase の signInWithPopup は、利用者がポップアップを手で閉じたとき、2 秒おきの監視で閉じたのに
 * 気づいてから、さらに 8 秒待って auth/popup-closed-by-user を返す(ポップアップを閉じた後に
 * 認証の結果が届く環境への用心。@firebase/auth の PopupOperation.pollUserCancellation)。
 * そのため閉じてから 8〜10 秒はログインボタンが回り続け、モーダルも閉じられない。
 * ここで自前に見張って先に気づき、ログインの画面を戻す。
 *
 * ポップアップの参照は signInWithPopup の中で window.open され、外へは出てこない。
 * 呼ぶ直前に window.open を一時的に包んで戻り値を控え、最初の 1 回を捕まえたら元に戻す
 * (Firebase の内部 API には頼らず、window.open という安定した入口だけに頼る)。
 *
 * 「閉じた」が「やめた」とは限らない点に注意。認可が成功したとき、デスクトップの Chrome/Safari では
 * SDK が結果を解決した後にポップアップを閉じるが、モバイルブラウザと Firefox では Firebase の
 * ハンドラがポップアップを自分で閉じ、その後に SDK の通信(signInWithIdp など 2 往復)が続く。
 * 呼び出し側は shouldIgnoreClose で「結果を処理中」を伝え、その間の閉じは知らせない。
 *
 * 見張れないときは何もしない。iOS のホーム画面追加版は Firebase がリンクのクリックで開くため
 * window.open を呼ばず、ポップアップがブロックされたときは null が返る。その場合は
 * Firebase の通知か、呼び出し側のタイムアウトに任せる。
 */

export type PopupClosedWatchOptions = {
  // 閉じられたかを確かめる間隔
  pollMs?: number;
  // 閉じたのを見つけてから onClosed を呼ぶまでの猶予。閉じた直後に結果の処理が始まる環境で、
  // shouldIgnoreClose が真になるまでの時間を稼ぐ
  graceMs?: number;
  // 閉じていても「やめた」とは限らない状況なら true を返す(例: 認証の結果を処理中)。
  // 閉じたのを見つけたときと猶予が明けたときに確かめ、true なら知らせずに見張りをやめる
  shouldIgnoreClose?: () => boolean;
};

const DEFAULT_POLL_MS = 500;
const DEFAULT_GRACE_MS = 1500;

/*
 * window.open の包みは全体で 1 つ。複数の見張りが重なっても二重に包まず、待っている見張りが
 * 無くなった時点で元に戻す(見張りごとに入れ子で包むと、途中の見張りがやめたときに自分だけ外せず、
 * 素通しの包みが残ってしまう)。開かれたポップアップは、その時点で待っている見張り全部に渡す。
 */
type PopupWaiter = (popup: Window | null) => void;

const waiters = new Set<PopupWaiter>();
let patched: { original: typeof window.open; wrapped: typeof window.open } | null = null;

function ensurePatched() {
  if (patched) return;

  const original = window.open;
  const wrapped: typeof window.open = function (...args) {
    const popup = original.apply(window, args);

    // 最初の 1 回で待っている見張り全部に渡し、包みは外す
    const pending = [...waiters];
    waiters.clear();
    unpatch();
    for (const deliver of pending) deliver(popup);

    return popup;
  };

  window.open = wrapped;
  patched = { original, wrapped };
}

function unpatch() {
  if (!patched) return;
  // 他の誰かが後から差し替えていたら触らない
  if (window.open === patched.wrapped) {
    window.open = patched.original;
  }
  patched = null;
}

// 次に window.open で開かれるものを deliver に渡す。戻り値で待つのをやめる
function awaitNextPopup(deliver: PopupWaiter): () => void {
  waiters.add(deliver);
  ensurePatched();

  return () => {
    waiters.delete(deliver);
    if (waiters.size === 0) unpatch();
  };
}

/*
 * 次に window.open で開かれるポップアップを見張り、閉じられたら onClosed を呼ぶ(1 回だけ)。
 * 戻り値の関数で見張りをやめる(window.open も元に戻す)。やめた後は onClosed を呼ばない。
 */
export function watchPopupClosed(
  onClosed: () => void,
  options: PopupClosedWatchOptions = {},
): () => void {
  const {
    pollMs = DEFAULT_POLL_MS,
    graceMs = DEFAULT_GRACE_MS,
    shouldIgnoreClose = () => false,
  } = options;

  let stopped = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  let check: (() => void) | null = null;
  let cancelWaiting: () => void = () => {};

  const stop = () => {
    if (stopped) return;
    stopped = true;

    cancelWaiting();
    if (pollTimer !== null) clearTimeout(pollTimer);
    if (graceTimer !== null) clearTimeout(graceTimer);
    if (check) {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    }
  };

  const watch = (popup: Window) => {
    check = () => {
      if (stopped || graceTimer !== null) return;

      if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }

      if (popup.closed) {
        if (shouldIgnoreClose()) {
          stop();
          return;
        }

        graceTimer = setTimeout(() => {
          graceTimer = null;
          stop();
          if (!shouldIgnoreClose()) onClosed();
        }, graceMs);
        return;
      }

      pollTimer = setTimeout(check!, pollMs);
    };

    // ポップアップから戻ってきた瞬間にも確かめる。iOS では背面に回ったタブのタイマーが止まるので、
    // 周期だけに頼ると戻ってから次の周期まで待たされる。デスクトップではポップアップが閉じると
    // 元のウィンドウに focus が戻るので、周期を待たずに気づける
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();
  };

  cancelWaiting = awaitNextPopup((popup) => {
    if (popup && !stopped) watch(popup);
  });

  return stop;
}
