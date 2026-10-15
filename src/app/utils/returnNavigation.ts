/*
 * 最後に「戻ってきた」ページ移動の時刻と行き先。
 *
 * 戻ってきたときにだけ前の状態を戻したい一覧(みんなの公開デッキの一覧・投稿者ページ)が、
 * 自分の現れ方を見分けるのに使う。控えを置いたまま下部ナビなど別の経路から開き直したときに、
 * 古い一覧や位置を出さないため。
 *
 * 「戻ってきた」とみなすのは2つ。どちらも useScrollResetOnNavigation が記録する。
 *   - ブラウザの戻る/進む(popstate。モーダルを閉じるためのバックは除く)
 *   - ページ内の戻るリンク(BackLink の「‹ みんなの公開デッキ」)。ホーム画面に追加したアプリには
 *     ブラウザの戻るボタンが無いので、こちらが主な戻り方になる
 *
 * 行き先も控えるのは、別のページで戻ってきたこと(たとえば大会結果の戻るリンク)を、
 * 後から下部ナビで開いた一覧が「戻ってきた」と取り違えないため。
 * 履歴移動でページごと読み込まれたとき(リロード後に戻ったときなど)は、その読み込みを
 * そのページへの戻りとして扱う。
 */

let lastReturn = { at: 0, path: "" };

// 戻ってきたことを控える。path は行き先(既定は今のページ。popstate の時点で移動後の URL になっている)
export function noteReturnNavigation(path: string = window.location.pathname): void {
  lastReturn = { at: Date.now(), path };
}

// このページが履歴移動で読み込まれたか
function loadedHereByHistoryTraversal(): boolean {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return (
      entry?.type === "back_forward" &&
      new URL(entry.name).pathname === window.location.pathname
    );
  } catch {
    return false;
  }
}

// time(Date.now() の値)より後に、今いるページへ戻ってきたか
export function hasReturnedHereSince(time: number): boolean {
  if (lastReturn.at > time && lastReturn.path === window.location.pathname) return true;

  // ページごと読み込まれた場合は、読み込んだ時刻をこのページへ戻った時刻とみなす
  return loadedHereByHistoryTraversal() && performance.timeOrigin > time;
}
