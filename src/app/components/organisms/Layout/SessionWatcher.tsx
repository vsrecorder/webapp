"use client";

import { useEffect, useRef } from "react";

import { useSession } from "next-auth/react";

import { handleSignOut } from "@app/handlers/handleSignOut";

// SessionProviderのrefetchIntervalによる定期チェックで、
// 他端末での退会等によりセッションが失効したことを検知する。
// ログイン中だったセッションが失効に変わった場合のみサインアウト処理を行い、
// 元々未ログインのページ表示時（初回status確定時）は対象外とする。
export default function SessionWatcher() {
  const { status } = useSession();
  const prevStatusRef = useRef(status);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prevStatus === "authenticated" && status === "unauthenticated") {
      handleSignOut();
    }
  }, [status]);

  return null;
}
