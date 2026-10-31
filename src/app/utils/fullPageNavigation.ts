/*
 * 画面ごと遷移する(router.push ではなく意図的にフルロードする)。
 *
 * ログインの前後は Firebase のサインイン状態を触っており、サーバ側のセッション Cookie を
 * 読み直させる必要がある。そのための遷移をここに集め、テストで差し替えられるようにしている。
 */

export const navigateFullPage = (url: string): void => {
  window.location.href = url;
};

// 今いるページを URL を変えずに読み直す
export const reloadPage = (): void => {
  window.location.reload();
};
