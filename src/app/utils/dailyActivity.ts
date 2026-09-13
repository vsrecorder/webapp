// 日次の利用シグナル（user_daily_activities）を送る共通処理。
//
// 元は DailyActivityBeacon の内部実装だったが、ルートからは判定できないシグナル
// （空状態CTAの表示・モーダルで開くフォーム）もコンポーネントから送る必要が出たため、
// 当日1回に間引く仕組みごとここへ切り出した。
// カテゴリ名は core-apiserver の entity.UserDailyActivityCategories と一致させること。

// サイトを開いたこと自体を表すカテゴリ。全ページで必ず送る。
export const ACTIVITY_VISIT = "visit";

// 端末・起動方法から決まるカテゴリ（ルート判定ではないため CATEGORY_RULES とは別扱い）。
export const ACTIVITY_STANDALONE = "standalone";
export const ACTIVITY_PUSH_CAPABLE = "push_capable";

// 初回記録ファネルのステップ（engagement-weekly-2026-09-14.md §5.6）。
// 「記録したか/しなかったか」の2値では、W0記録率が7コホート動かない理由を絞れないため、
// 登録 → visit → onboarding_cta → record_form → records の5段で落ちどころを見る。
export const ACTIVITY_ONBOARDING_CTA = "onboarding_cta";
export const ACTIVITY_RECORD_FORM = "record_form";
export const ACTIVITY_DECK_FORM = "deck_form";

const KEY_PREFIX = "vsrec:daily-activity:";

// JSTの当日を "YYYY-MM-DD" で得る。端末のタイムゾーンに依存させない
// （サーバ側もJSTの当日で行を作るため、日付境界の解釈を揃える）。
function todayJST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}

// 当日まだ送っていないカテゴリだけを1リクエストにまとめて送る。
//
// 素直に毎マウントで叩くとSPA遷移のたびにリクエストが飛ぶため、localStorageに
// カテゴリごとの最終送信日を持たせて間引き、実質「1ユーザー1日1リクエスト」に収める。
// （view数を正確に測りたくなったらこの間引きを外し、サーバ側の加算に任せる）
export async function sendDailyActivity(categories: string[]): Promise<void> {
  const today = todayJST();

  let pending: string[];
  try {
    pending = categories.filter((category) => {
      return localStorage.getItem(KEY_PREFIX + category) !== today;
    });
  } catch {
    // localStorage が使えない環境（プライベートウィンドウ等）では間引きを諦めて送る。
    // 計測が増えるぶんには集計側が日次で丸めるので害がない
    pending = categories;
  }

  if (pending.length === 0) {
    return;
  }

  try {
    const res = await fetch("/api/users/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: pending }),
      keepalive: true,
    });

    // 送信できたぶんだけ当日送信済みとして記録する。
    // 失敗時は何も書かないので、次のページ遷移で再試行される。
    if (res.ok) {
      try {
        pending.forEach((category) => localStorage.setItem(KEY_PREFIX + category, today));
      } catch {
        // 書けなくても計測そのものは済んでいるので無視する
      }
    }
  } catch {
    // 計測の失敗はUXに影響させない（トーストも出さずリトライもしない）
  }
}
