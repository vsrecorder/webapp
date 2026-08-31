// 登録時アンケート「どこでバトレコを知りましたか？」(施策0-4 S4)の表示管理。
//
// UTM は「タグ付きリンクを踏んだ人」しか捕捉できず、判明率70%の主な達成手段は
// このアンケート(utm-attribution-plan.md §3.6)。訊くのは新規登録の直後だけで、
// フラグは handleSignIn が isNewUser のときに立て、回答かスキップで消える。

const PENDING_KEY = "vsrec:acq-survey:pending";

// 登録直後に答えなかった場合に再表示を続ける期間。
// これを過ぎた回答は記憶が薄れて精度が落ちるので、訊かずに諦める。
const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// 新規登録の成功直後に呼ぶ。localStorage なのはリダイレクトをまたぐため
// (登録完了は window.location.href の遷移で完結する)。
export function markAcquisitionSurveyPending(): void {
  try {
    localStorage.setItem(PENDING_KEY, String(Date.now()));
  } catch {
    // プライベートモード等で書けない場合は訊かないだけで、登録は妨げない
  }
}

export function isAcquisitionSurveyPending(): boolean {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return false;

    const markedAt = Number(raw);
    if (!Number.isFinite(markedAt) || Date.now() - markedAt > PENDING_MAX_AGE_MS) {
      localStorage.removeItem(PENDING_KEY);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function clearAcquisitionSurveyPending(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // 消せなくても実害は「もう一度訊かれる」だけ
  }
}

// 回答の選択肢。値は core-apiserver の entity.AcquisitionSurveyAnswer* と一致させること。
export const ACQUISITION_SURVEY_CHOICES: readonly { value: string; label: string }[] = [
  { value: "x", label: "X (Twitter)" },
  { value: "friend", label: "友人・知人" },
  { value: "search", label: "検索" },
  { value: "other", label: "その他" },
] as const;
