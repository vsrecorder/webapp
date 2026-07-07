// 実行環境(ENV)がdev環境かどうかを返す。
// このアプリは環境ごとにイメージを作り分けず、起動時のENV変数のみで挙動を切り替えるため、
// クライアントコンポーネントではNEXT_PUBLIC_*変数ではなく、サーバーコンポーネントから
// props経由でこの値を渡す必要がある。
export function isDevEnv(): boolean {
  return process.env.ENV === "dev";
}

// 実行環境(ENV)に応じてアプリ全体で使うアイコンのURLを返す
export function getAppIconUrl(): string {
  return isDevEnv()
    ? "/icon_dev-512x512.png"
    : "https://xx8nnpgt.user.webaccel.jp/images/icons/icon.png";
}
