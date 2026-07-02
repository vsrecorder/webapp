"use client";

import { useEffect } from "react";

// ルートレイアウトを丸ごと置き換えるため、layout.tsx のCSS importは効かない。
// Tailwindのユーティリティクラスを使うにはここで明示的に読み込む必要がある。
import "./globals.css";

const isDev = process.env.NODE_ENV === "development";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // ルートレイアウト自体が壊れているため、Providers（HeroUI/next-themes/next-auth）は
  // 一切使わず、素のHTML+Tailwindユーティリティクラスのみで自己完結させる。
  // ここでのログ出力を将来 Sentry 等の外部監視サービスに差し替える想定。
  useEffect(() => {
    console.error("ルートレイアウトでエラーが発生しました:", error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="bg-white text-neutral-800">
        <div className="flex flex-col items-center justify-center min-h-svh gap-4 px-4 text-center">
          <div className="flex flex-col items-center gap-3 max-w-md rounded-2xl border border-neutral-200 shadow-sm px-6 py-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- Providers非依存の最終防衛ラインのため next/image を使わない */}
            <img src="/images/icon.png" alt="バトレコ" width={48} height={48} className="rounded-lg" />

            <h1 className="text-lg font-black">問題が発生しました</h1>

            <p className="text-sm text-neutral-500 leading-relaxed">
              予期しないエラーが発生しました。お手数ですが、再読み込みをお試しください。
            </p>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-full px-4 py-1.5 text-sm font-bold text-white"
                style={{ backgroundColor: "#2563EB" }}
              >
                再読み込み
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ルートレイアウト自体が壊れている状況を想定し、Routerに依存しない確実な遷移にする */}
              <a
                href="/"
                className="rounded-full px-4 py-1.5 text-sm font-bold text-neutral-600 border border-neutral-300"
              >
                トップへ戻る
              </a>
            </div>

            {isDev ? (
              <details className="w-full mt-2 text-left">
                <summary className="text-xs text-neutral-400 cursor-pointer">
                  エラー詳細（開発環境のみ表示）
                </summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap break-all text-red-600">
                  {error.stack ?? error.message}
                </pre>
              </details>
            ) : error.digest ? (
              <p className="text-xs text-neutral-400">エラーコード: {error.digest}</p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
