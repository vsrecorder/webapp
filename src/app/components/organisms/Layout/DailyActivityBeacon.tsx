"use client";

import { useEffect } from "react";

import { usePathname } from "next/navigation";

import { useSession } from "next-auth/react";

// ログイン済みユーザーの「見る」利用を日次で計測するビーコン
// （USER_DAILY_ACTIVITIES_PLAN.md）。
//
// records/decks の「作成」しか活動として測れていないため、戦績を見返しに来ただけの
// ユーザーが活動として計上されない。そこで「その日サイトを開いたか（visit）」と
// 「その日自分の戦績を見返したか（review）」を送り、記録経験者を
// 「記録あり / 見返しのみ / 訪問のみ / 不在」の4層に分解できるようにする。

// ルート → 計測カテゴリの対応（判定表は USER_DAILY_ACTIVITIES_PLAN.md §2）。
// 新しいカテゴリを追加するときは、この配列に1要素足すだけでよい
// （送信ロジック・BFF・core-apiserverはいずれも変更不要）。
// カテゴリ名は core-apiserver の entity.UserDailyActivityCategories と一致させること。
const CATEGORY_RULES: { category: string; patterns: RegExp[] }[] = [
  {
    // 自分の蓄積（対戦記録・デッキ・戦績サマリー）を見返しているとみなすルート。
    // /records/create と /records/quick は記録の"作成"であって見返しではないため、
    // 前方一致で巻き込まないよう明示的に除外する。
    category: "review",
    patterns: [
      /^\/records$/,
      /^\/records\/(?!create$|quick$)[^/]+$/,
      /^\/users$/,
      /^\/decks$/,
      /^\/decks\/[^/]+$/,
      /^\/users\/report(\/.*)?$/,
    ],
  },
  {
    // バトルレポート(週次・月次・環境別)を開いた。review の部分集合として別に数え、
    // 週次レポート通知(P-2)の閲覧率を「通知した人のうち何人がレポートまで来たか」で測る。
    // カテゴリ名は core-apiserver の UserDailyActivityCategoryReport と一致させている。
    category: "report",
    patterns: [/^\/users\/report(\/.*)?$/],
  },
  // 例）将来 /calendar を独立したカテゴリにする場合:
  // { category: "event", patterns: [/^\/calendar$/] },
];

// サイトを開いたこと自体を表すカテゴリ。全ページで必ず送る。
const BASE_CATEGORY = "visit";

// 端末・起動方法から決まるカテゴリ。ルート判定ではないため CATEGORY_RULES とは
// 別の分岐で持つ（USER_DAILY_ACTIVITIES_PLAN.md §3.3 の注記）。
const CATEGORY_STANDALONE = "standalone";
const CATEGORY_PUSH_CAPABLE = "push_capable";

// その日の「起動方法」と「Web Pushを受けられる環境か」を返す。
// Web Push（B-1）に投資してよいかは iOS の到達率で決まるが、iOS はホーム画面に
// 追加したPWAでしか PushManager が生えない。そこで
//   push_capable         = 到達率の上限（＝いま通知を送れる人の規模）
//   standalone           = PWA起動の規模（＝インストール訴求の効き具合）
// の2つを測り、差分を「インストールさえされれば届く層」として読む
// （WAU_RECOVERY_EXECUTION_PLAN.md Step 0-C）。
function deviceCategories(): string[] {
  const categories: string[] = [];

  // iOS Safari のホーム画面追加だけは display-mode メディアクエリに乗らない時期が
  // あるため、非標準の navigator.standalone も併せて見る。
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (standalone) {
    categories.push(CATEGORY_STANDALONE);
  }

  // 許諾の可否ではなくAPIの有無を見る（許諾はUIを出してからでないと分からず、
  // 出す前に規模を知りたいのがこの計測の目的のため）。
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
    categories.push(CATEGORY_PUSH_CAPABLE);
  }

  return categories;
}

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
async function sendPending(categories: string[]): Promise<void> {
  const today = todayJST();
  const pending = categories.filter((category) => {
    return localStorage.getItem(KEY_PREFIX + category) !== today;
  });

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
      pending.forEach((category) => localStorage.setItem(KEY_PREFIX + category, today));
    }
  } catch {
    // 計測の失敗はUXに影響させない（トーストも出さずリトライもしない）
  }
}

export default function DailyActivityBeacon() {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const matched = CATEGORY_RULES.filter((rule) =>
      rule.patterns.some((pattern) => pattern.test(pathname)),
    ).map((rule) => rule.category);

    void sendPending([BASE_CATEGORY, ...matched, ...deviceCategories()]);
  }, [status, pathname]);

  return null;
}
