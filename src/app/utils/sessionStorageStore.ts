/*
 * sessionStorage を React の「外部ストア」として扱うための読み書きと購読。
 * localStorageStore と同じ作り(理由もそちらを参照)。
 *
 * 戻り遷移でモーダルを開き直すためのフラグ(utils/recordModalReopen, deckModalReopen)は
 * ここを通して読み書きし、消した瞬間に読み手(一覧・カード)がその場で追随できるようにする。
 * → hooks/useSessionStorageItem
 */

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeSessionStorage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// 読めない環境では null
export function readSessionStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

// null を渡すと削除する。書けない環境では何もしない
export function writeSessionStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
    }
  } catch {
    // 書けなくても表示は続ける
  }
  notify();
}
