"use client";

import { useEffect } from "react";

import { Button } from "@heroui/react";
import { LuTriangleAlert } from "react-icons/lu";
import Link from "next/link";

const isDev = process.env.NODE_ENV === "development";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // ルートレイアウト（Navigation/Header）は生きたままこのコンテンツだけが差し替わる。
  // ここでのログ出力を将来 Sentry 等の外部監視サービスに差し替える想定。
  useEffect(() => {
    console.error("クライアントサイドでエラーが発生しました:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60svh] gap-4 px-4 text-center">
      <div className="flex flex-col items-center gap-3 max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm px-6 py-8">
        <LuTriangleAlert className="w-8 h-8 text-danger" />

        <h1 className="text-lg font-black text-neutral-800 dark:text-neutral-100">
          問題が発生しました
        </h1>

        <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
          予期しないエラーが発生しました。お手数ですが、再読み込みをお試しください。
        </p>

        <div className="flex gap-3 mt-2">
          <Button color="primary" radius="full" size="sm" onPress={() => reset()}>
            再読み込み
          </Button>
          <Button as={Link} href="/" variant="light" radius="full" size="sm">
            トップへ戻る
          </Button>
        </div>

        {isDev ? (
          <details className="w-full mt-2 text-left">
            <summary className="text-xs text-neutral-400 cursor-pointer">
              エラー詳細（開発環境のみ表示）
            </summary>
            <pre className="mt-2 text-xs whitespace-pre-wrap break-all text-danger">
              {error.stack ?? error.message}
            </pre>
          </details>
        ) : error.digest ? (
          <p className="text-xs text-neutral-400">エラーコード: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
