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

// 失効と確定させるまでの再確認回数と間隔（ミリ秒）
const VERIFY_RETRY_COUNT = 3;
const VERIFY_RETRY_INTERVAL_MS = 2000;

// 再確認1回あたりのタイムアウト（ミリ秒）
const VERIFY_TIMEOUT_MS = 5000;

// active : サーバがセッションを返した（ログイン中）
// expired: サーバがセッション無しと明示的に応答した（失効）
// unknown: 応答自体が得られず判断できない（通信エラー等）
type SessionState = "active" | "expired" | "unknown";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    // 未ログイン時、next-authはnull（実装によっては空オブジェクト）を返す
    const session = await res.json();
    return session?.user ? "active" : "expired";
  } catch (error) {
    console.warn("Failed to verify session:", error);
    return "unknown";
  }
}

// セッションが本当に失効したかを確認する。
// サーバから明示的な応答が得られた場合はそれを信用し、
// 応答が得られない場合のみ間隔を空けて最大VERIFY_RETRY_COUNT回まで再確認する。
// 最後まで判断できなかった場合はセッションを維持する（フェイルオープン）。
async function isSessionExpired(): Promise<boolean> {
  for (let attempt = 1; attempt <= VERIFY_RETRY_COUNT; attempt++) {
    const state = await fetchSessionState();

    if (state !== "unknown") {
      return state === "expired";
    }

    if (attempt < VERIFY_RETRY_COUNT) {
      await sleep(VERIFY_RETRY_INTERVAL_MS);
    }
  }

  return false;
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
      if (await isSessionExpired()) {
        if (!cancelled) {
          handleSignOut();
        }
        return;
      }

      if (cancelled) {
        return;
      }

      // 一時的な取得失敗だったので、クライアント側のセッション状態を復旧する。
      // next-authは取得に失敗すると内部状態(__NEXTAUTH._session)もnullにしてしまい、
      // 定期ポーリングも visibilitychange での再取得も「_sessionがnullなら何もしない」
      // という条件で止まるため、放置するとリロードするまで復帰できない。
      // event: "storage" は内部状態のnullチェックを経ずに取得し直す経路のため、
      // これを使ってReactのstateと内部状態の両方を戻す。
      await __NEXTAUTH._getSession({ event: "storage" });
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
