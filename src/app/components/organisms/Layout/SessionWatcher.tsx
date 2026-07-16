"use client";

import { useEffect, useRef } from "react";

import { useSession, __NEXTAUTH } from "next-auth/react";

import { handleSignOut } from "@app/handlers/handleSignOut";

// SessionProviderのrefetchIntervalによる定期チェックで、
// 他端末での退会等によりセッションが失効したことを検知する。
// ログイン中だったセッションが失効に変わった場合のみサインアウト処理を行い、
// 元々未ログインのページ表示時（初回status確定時）は対象外とする。
//
// 注意: next-authのクライアントは /api/auth/session の取得に失敗した場合
// （通信断・5xx・プロキシのHTMLエラーページ等）もエラーを握りつぶしてnullを返すため、
// status上は「失効」と全く区別がつかない。
// これをそのままサインアウトに繋げると、スリープ復帰やWi-Fi瞬断、webappのデプロイ中など
// 一時的な失敗だけで本当にセッションを破棄してしまう。
// そのためstatusの変化を即断せず、失効かどうかを自前で確認してから判断する。

// 確認1回あたりのタイムアウト（ミリ秒）
const VERIFY_TIMEOUT_MS = 5000;

// 失効かどうか判断できなかった場合の再確認間隔（ミリ秒）。
// 通信の復帰を待ち続ける必要があるため、間隔を指数的に延ばして上限で頭打ちにする。
const RETRY_INITIAL_INTERVAL_MS = 2000;
const RETRY_MAX_INTERVAL_MS = 30 * 1000;

// active : サーバがセッションを返した（ログイン中）
// expired: サーバがセッション無しと明示的に応答した（失効）
// unknown: 応答自体が得られず判断できない（通信エラー等）
type SessionState = "active" | "expired" | "unknown";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryInterval(attempt: number): number {
  return Math.min(RETRY_INITIAL_INTERVAL_MS * 2 ** attempt, RETRY_MAX_INTERVAL_MS);
}

// セッションが失効したかどうかをサーバに直接確認する。
async function fetchSessionState(): Promise<SessionState> {
  try {
    const res = await fetch("/api/auth/session", {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    // プロキシ層の障害時などにnext-authを経由しない応答（HTMLのエラーページ等）が
    // 返ることがあるため、JSONで応答されたことも確認した上で判定する。
    const isJson = (res.headers.get("content-type") ?? "").includes("application/json");
    if (!res.ok || !isJson) {
      return "unknown";
    }

    // 未ログイン時、next-authはnullを返す
    const session = await res.json();
    return session?.user ? "active" : "expired";
  } catch (error) {
    console.warn("Failed to verify session:", error);
    return "unknown";
  }
}

// 一時的な取得失敗だった場合に、クライアント側のセッション状態を復旧する。
// next-authは取得に失敗すると内部状態(__NEXTAUTH._session)もnullにしてしまい、
// 定期ポーリングもvisibilitychangeでの再取得も「_sessionがnullなら何もしない」
// という条件で止まるため、放置するとリロードするまで復帰できない。
// event: "storage" は内部状態のnullチェックを経ずに取得し直す経路のため、
// これを使ってReactのstateと内部状態の両方を戻す。
async function restoreSession(): Promise<boolean> {
  await __NEXTAUTH._getSession({ event: "storage" });
  return Boolean(__NEXTAUTH._session);
}

export default function SessionWatcher() {
  const { status } = useSession();
  const prevStatusRef = useRef(status);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prevStatus !== "authenticated" || status !== "unauthenticated") {
      return;
    }

    let cancelled = false;

    (async () => {
      // 失効が確定するか、通信が復帰してセッションを取り戻せるまで繰り返す。
      // ここで諦めてしまうと、セッション自体は生きているのに画面だけログアウト状態のまま
      // 固まってしまう。next-auth側の再取得は内部状態がnullになった時点で止まっており、
      // リロードされるまで二度と動かないため、復旧はこちらでやりきる必要がある。
      for (let attempt = 0; !cancelled; attempt++) {
        const state = await fetchSessionState();
        if (cancelled) {
          return;
        }

        if (state === "expired") {
          handleSignOut();
          return;
        }

        if (state === "active" && (await restoreSession())) {
          return;
        }

        if (cancelled) {
          return;
        }

        await sleep(retryInterval(attempt));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
