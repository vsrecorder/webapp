/*
 * window.fetch を一時的に包み、条件に合う要求が始まった瞬間を知らせる。
 *
 * 使いどころ: Firebase の signInWithPopup は、認可が済むと identitytoolkit の accounts:signInWithIdp へ
 * 要求を出す。これが始まっていれば認証は成功しているので、そのときポップアップが閉じていても
 * 「利用者がやめた」ではない(handlers/handleSignIn)。SDK は呼び出しのたびに self.fetch を読む
 * (FetchProvider.fetch)ので、包めば通る。
 *
 * 包みは全体で 1 つにし、最後の見張りがやめたときに元に戻す。見張りごとに入れ子で包むと、
 * 途中の見張りがやめたときに自分だけ外せず、素通しの包みが残ってしまう。
 */

type FetchListener = {
  matches: (url: string) => boolean;
  onStart: () => void;
};

const listeners = new Set<FetchListener>();
let patched: { original: typeof window.fetch; wrapped: typeof window.fetch } | null = null;

// 判定に使う URL。文字列・URL・Request 以外(型の上では来ないが、他所の包みが変な値を流すことはある)は
// 空文字にして「合わない」側に倒す
const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return typeof input?.url === "string" ? input.url : "";
};

function ensurePatched() {
  if (patched) return;

  const original = window.fetch;
  const wrapped: typeof window.fetch = function (this: unknown, input, init) {
    let url = "";
    try {
      url = urlOf(input);
    } catch {
      // 読めない入力は合図の対象外にするだけで、要求自体は通す
    }

    for (const listener of [...listeners]) {
      try {
        if (listener.matches(url)) listener.onStart();
      } catch (error) {
        // 合図の側の失敗で要求を止めない
        console.error("fetch start listener failed:", error);
      }
    }

    // Firebase は this を付けずに呼ぶ(FetchProvider.fetch()(url, ...))。素の fetch はそれでも動くが、
    // 包んだ側では明示して渡す
    return original.call(this ?? window, input, init);
  };

  window.fetch = wrapped;
  patched = { original, wrapped };
}

function unpatch() {
  if (!patched) return;
  // 他の誰かが後から差し替えていたら触らない
  if (window.fetch === patched.wrapped) {
    window.fetch = patched.original;
  }
  patched = null;
}

/*
 * matches(url) が真の要求が始まったら onStart を呼ぶ(要求のたびに呼ぶ)。
 * 戻り値の関数で見張りをやめる。全部の見張りがやめた時点で window.fetch を元に戻す。
 */
export function watchFetchStart(
  matches: (url: string) => boolean,
  onStart: () => void,
): () => void {
  const listener: FetchListener = { matches, onStart };
  listeners.add(listener);
  ensurePatched();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) unpatch();
  };
}
