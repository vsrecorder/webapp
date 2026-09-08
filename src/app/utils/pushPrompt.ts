// Web Push の許諾プロンプト(soft ask)の表示制御に使う、端末ローカルの状態。
//
// ブラウザの許諾ダイアログは一度「ブロック」されると回復できないため、
// 自前のプロンプト(PushPermissionPrompt)を挟み、同意した人にだけブラウザ許諾を求める
// (B1_B2_PUSH_NOTIFICATION_PLAN.md D3)。ここでは「いつ出すか」の材料だけを持つ。
//
// どちらの材料も、表示側(PushPermissionPrompt)が描画中に読めるよう「購読できる外部ストア」の
// 形にしてある(useSyncExternalStore 経由。effect で読んで setState すると描画が二度走る)。

import { writeLocalStorage } from "@app/utils/localStorageStore";

// 記録作成の完了直後に立てるフラグ。記録作成は完了直後に記録詳細へ遷移するため、
// 遷移先でプロンプトを出せるよう sessionStorage 経由で渡す(タブを閉じれば消える)。
const RECORD_CREATED_TRIGGER_KEY = "vsrec:push-prompt:record-created";

// 「あとで」を押した時刻。14日間は再表示しない。
// ホーム画面追加バナー(useInstallPrompt)の7日より長くしているのは、
// 通知の再勧誘はインストールより嫌われやすいため。
export const PUSH_PROMPT_DISMISSED_AT_KEY = "vsrec:push-prompt:dismissed-at";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export type PushPromptSource = "record_created" | "streak";

/*
 * 記録作成のトリガーは、読み出した時点で sessionStorage から消し、このページの表示中は
 * 覚えておく(1回の記録作成につき1回だけ出す。リロードすれば消える)。
 *   null  … まだ読んでいない(次に読むときに sessionStorage を見る)
 *   true  … 立っていた(出すか捨てるかは表示側が決める)
 *   false … 立っていなかった / 捨てた
 */
let recordCreatedTrigger: boolean | null = null;
const triggerListeners = new Set<() => void>();

function notifyTriggerChange(): void {
  for (const listener of triggerListeners) listener();
}

export function markRecordCreatedForPushPrompt(): void {
  try {
    sessionStorage.setItem(RECORD_CREATED_TRIGGER_KEY, String(Date.now()));
  } catch {
    // ストレージが使えない環境では出さないだけ
  }
  // 次に読むときに sessionStorage を見直させる。ここで通知はしない: 記録作成の直後は
  // 記録詳細へ遷移するので、遷移先の描画で読まれる(作成ページで一瞬出るのを避ける)
  recordCreatedTrigger = null;
}

// フラグが立っていれば消して true を返す(1回の記録作成につき1回だけ出す)。
function consumeRecordCreatedTrigger(): boolean {
  try {
    if (sessionStorage.getItem(RECORD_CREATED_TRIGGER_KEY) === null) return false;
    sessionStorage.removeItem(RECORD_CREATED_TRIGGER_KEY);
    return true;
  } catch {
    return false;
  }
}

// 記録作成のトリガーが立っているか。初回だけ sessionStorage から読んで(消して)覚える。
// useSyncExternalStore の getSnapshot として使う(何度呼んでも同じ値を返す)
export function readRecordCreatedTrigger(): boolean {
  if (recordCreatedTrigger === null) {
    recordCreatedTrigger = consumeRecordCreatedTrigger();
  }
  return recordCreatedTrigger;
}

export function subscribeRecordCreatedTrigger(listener: () => void): () => void {
  triggerListeners.add(listener);
  return () => {
    triggerListeners.delete(listener);
  };
}

// 記録作成のトリガーを捨てる。出せない状態のときに捨てておくことで、次に条件が揃ったとき
// 何週間も前の記録作成を根拠に突然出るのを防ぐ。出したあと(受け取る/あとで)にも捨てる
export function discardRecordCreatedTrigger(): void {
  try {
    sessionStorage.removeItem(RECORD_CREATED_TRIGGER_KEY);
  } catch {
    // 消せなければ次回また読まれるだけ
  }
  if (recordCreatedTrigger !== false) {
    recordCreatedTrigger = false;
    notifyTriggerChange();
  }
}

// 「あとで」を押してから再表示しない期間の中か(dismissedAt は localStorage の生の値)
export function isPushPromptDismissedAt(dismissedAt: string | null): boolean {
  return dismissedAt !== null && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS;
}

export function dismissPushPrompt(): void {
  // 記録できなければ次回また出るだけ(writeLocalStorage は書けない環境でも投げない)
  writeLocalStorage(PUSH_PROMPT_DISMISSED_AT_KEY, String(Date.now()));
}
