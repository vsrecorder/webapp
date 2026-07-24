// 機能フラグ。専用のフィーチャーフラグ基盤が無いため、サーバー環境変数(ENV方式)で
// 挙動を切り替える。クライアントコンポーネントでは NEXT_PUBLIC_* を使わず、
// サーバーコンポーネントから props 経由で渡す方針（appIcon.ts の isDevEnv と同じ流儀）。

// 「最初の記録を作る」CTA（施策0-6 止血）の表示可否。
// 既定は有効。緊急停止・段階公開したい場合のみ FIRST_RECORD_CTA_ENABLED=false を設定する。
export function isFirstRecordCtaEnabled(): boolean {
  return process.env.FIRST_RECORD_CTA_ENABLED !== "false";
}

// 「環境の窓」カード（施策E-2）の表示可否。記録0件ユーザーの空状態で、自分の登録デッキが
// 環境ランキングで何位かを先出しし、価値を前倒しする。
// 既定は有効。緊急停止・段階公開したい場合のみ ENV_WINDOW_ENABLED=false を設定する。
export function isEnvWindowEnabled(): boolean {
  return process.env.ENV_WINDOW_ENABLED !== "false";
}
