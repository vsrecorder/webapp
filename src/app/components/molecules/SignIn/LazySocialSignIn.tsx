"use client";

import { ComponentType, useEffect, useState } from "react";

import { Skeleton } from "@heroui/react";

import type { SocialSignInProps } from "./SocialSingIn";

/*
 * ソーシャルログインのボタン群(SocialSignIn)を、必要になるまで読み込まない。
 *
 * この部品は Firebase のクライアント SDK を引く(圧縮後 34KB)。ヘッダーのログイン／新規登録
 * ボタンが静的に import していたため、未ログインの訪問者は**開くかどうかに関わらず**
 * 全ての公開ページで読み込み待ちしていた(本番実測: 規約ページが読む 526KB のうち 34KB が
 * これで、しかも load 完了前＝ハイドレーションの経路に乗っていた)。
 *
 * 中身はモーダルを開いたときにだけ描画されるので、動的 import にすればそこで初めて読む。
 * 押してから読むと一瞬待たせるため、ボタンを押し始めた時点(onPressStart)で先読みできるよう
 * preloadSocialSignIn を公開している。指を離してモーダルが開く頃には読み終わっている。
 *
 * next/dynamic を使わないのは、その中身の React.lazy が「読み込み済みでも初回レンダーでは
 * 必ずサスペンドする」ため(理由の詳細は utils/lazyModal のコメントを参照)。先読みが済んでいれば
 * その場で同期的に描き始めたい。
 */

let Loaded: ComponentType<SocialSignInProps> | null = null;
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (!loading) {
    loading = import("./SocialSingIn").then(
      (mod) => {
        Loaded = mod.default;
      },
      (err) => {
        // 失敗をキャッシュしない。デプロイ跨ぎでチャンクが消えた等は再試行できるようにする
        loading = null;
        throw err;
      },
    );
  }

  return loading;
}

// ログイン／新規登録ボタンを押し始めたときに呼ぶ。読み込み済みなら何もしない
export function preloadSocialSignIn(): void {
  if (Loaded) return;

  void load().catch(() => {
    // 先読みの失敗は無視する。実際に開いたときに読み直す
  });
}

/*
 * 読み込み中の枠。実体は size="md"(高さ40px)のボタン2つを gap-3 で縦に並べるので、
 * 同じ高さ(40 + 12 + 40 = 92px)を確保してモーダルの中身が伸び縮みしないようにする。
 */
function Placeholder() {
  return (
    <div className="flex w-full flex-col gap-3" aria-hidden>
      <Skeleton className="h-10 w-full rounded-medium" />
      <Skeleton className="h-10 w-full rounded-medium" />
    </div>
  );
}

export default function LazySocialSignIn(props: SocialSignInProps) {
  const [, setLoadedAt] = useState(0);

  useEffect(() => {
    if (Loaded) return;

    let cancelled = false;
    load()
      .then(() => {
        if (!cancelled) setLoadedAt(Date.now());
      })
      .catch((err) => {
        console.error("Failed to load the sign-in buttons:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!Loaded) return <Placeholder />;

  return <Loaded {...props} />;
}
