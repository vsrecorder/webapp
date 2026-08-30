// Web Push の許諾プロンプト(soft ask)の表示制御に使う、端末ローカルの状態。
//
// ブラウザの許諾ダイアログは一度「ブロック」されると回復できないため、
// 自前のプロンプト(PushPermissionPrompt)を挟み、同意した人にだけブラウザ許諾を求める
// (B1_B2_PUSH_NOTIFICATION_PLAN.md D3)。ここでは「いつ出すか」の材料だけを持つ。

// 記録作成の完了直後に立てるフラグ。記録作成は完了直後に記録詳細へ遷移するため、
// 遷移先でプロンプトを出せるよう sessionStorage 経由で渡す(タブを閉じれば消える)。
const RECORD_CREATED_TRIGGER_KEY = "vsrec:push-prompt:record-created";

// 「あとで」を押した時刻。14日間は再表示しない。
// ホーム画面追加バナー(useInstallPrompt)の3日より長くしているのは、
// 通知の再勧誘はインストールより嫌われやすいため。
const DISMISSED_AT_KEY = "vsrec:push-prompt:dismissed-at";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export type PushPromptSource = "record_created" | "streak";

export function markRecordCreatedForPushPrompt(): void {
  try {
    sessionStorage.setItem(RECORD_CREATED_TRIGGER_KEY, String(Date.now()));
  } catch {
    // ストレージが使えない環境では出さないだけ
  }
}

// フラグが立っていれば消して true を返す(1回の記録作成につき1回だけ出す)。
export function consumeRecordCreatedTrigger(): boolean {
  try {
    if (sessionStorage.getItem(RECORD_CREATED_TRIGGER_KEY) === null) return false;
    sessionStorage.removeItem(RECORD_CREATED_TRIGGER_KEY);
    return true;
  } catch {
    return false;
  }
}

export function isPushPromptDismissed(): boolean {
  try {
    const dismissedAt = localStorage.getItem(DISMISSED_AT_KEY);
    return dismissedAt !== null && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

export function dismissPushPrompt(): void {
  try {
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
  } catch {
    // 記録できなければ次回また出るだけ
  }
}
