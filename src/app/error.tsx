"use client";

import { startTransition, useEffect } from "react";

import { Button } from "@heroui/react";

import { isChunkLoadError } from "@app/utils/chunkLoadError";
import { UPSTREAM_UNAVAILABLE_DIGEST } from "@app/utils/upstreamOutage";
import {
  checkUpstream,
  enterUpstreamOutage,
  onUpstreamRecovered,
} from "@app/utils/upstreamOutageClient";
import { LuTriangleAlert } from "react-icons/lu";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  const router = useRouter();

  // core-apiserver の入れ替え中に落ちたのなら、このエラー画面ではなくアップデート中の覆いを出す
  // (components/organisms/Layout/UpdateOverlay.tsx。流れは utils/upstreamOutage.ts)。
  //
  // 上流に届かなかったサーバコンポーネントは digest 付きの例外を投げる(utils/coreApiFetch.ts)。
  // ただし上流を呼ぶ箇所の中には、失敗を自前の Error に包み直して投げるものもあるので、
  // digest が違っても一度だけ届くかを確かめる(エラー画面が出たときだけなので負荷にはならない)。
  useEffect(() => {
    if (isChunkLoadError(error)) return;
    if (error.digest === UPSTREAM_UNAVAILABLE_DIGEST) {
      enterUpstreamOutage("core");
      return;
    }
    // 503 の応答が返ったときだけ覆う。通信の失敗・時間切れ(unreachable)は利用者の回線の問題で
    // ありうるので数えない(ただの描画のバグで、回線が悪いだけなのに覆いが出て外れなくなる)
    let cancelled = false;
    void checkUpstream().then((result) => {
      if (!cancelled && result === "unavailable") enterUpstreamOutage("core");
    });
    return () => {
      cancelled = true;
    };
  }, [error]);

  // 覆いが外れたら(復旧したら)このページを描き直す。サーバコンポーネントの失敗は
  // reset() だけでは直らない(同じ RSC を描き直すだけ)ので、refresh で取り直してから戻す
  useEffect(
    () =>
      onUpstreamRecovered(() => {
        startTransition(() => {
          router.refresh();
          reset();
        });
      }),
    [router, reset],
  );

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
          {/* チャンク取得失敗(デプロイ跨ぎ)は reset() では復旧しないため、ページごと読み込み直す */}
          <Button
            color="primary"
            radius="full"
            size="sm"
            onPress={() => (isChunkLoadError(error) ? window.location.reload() : reset())}
          >
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
