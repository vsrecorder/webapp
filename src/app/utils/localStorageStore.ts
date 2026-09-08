/*
 * localStorage を React の「外部ストア」として扱うための読み書きと購読。
 *
 * localStorage はサーバ描画では読めず、素直に書くと「マウント後に useEffect で読んで
 * setState する」ことになる(effect からの同期的な setState はコミット直後の再描画を招く。
 * react-hooks/set-state-in-effect)。useSyncExternalStore で読めば、ハイドレーションの
 * 不一致を起こさずに描画中から値を参照できる。→ hooks/useLocalStorageItem
 *
 * 書き込みは writeLocalStorage を通す。ここで購読者へ通知するので、同じタブ内の
 * 読み手がその場で追随する(別タブは storage イベントで追随する)。
 */

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeLocalStorage(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// 読めない環境(プライベートモード等)では null
export function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// null を渡すと削除する。書けない環境では何もしない(呼び出し側は「保存されない」だけで済ませる)
export function writeLocalStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // 書けなくても表示は続ける
  }
  notify();
}
