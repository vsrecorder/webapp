"use client";

import React, { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { TwitterAuthProvider, GoogleAuthProvider } from "firebase/auth";

import { Button } from "@heroui/react";

import { FcGoogle } from "react-icons/fc";
import { RiTwitterXLine } from "react-icons/ri";

import { handleSignIn } from "@app/handlers/handleSignIn";
import type { SignInErrorStatus } from "@app/handlers/handleSignIn";
import { isInAppBrowser } from "@app/utils/platform";
import { resolveSignInReturnPath } from "@app/utils/signInReturn";
import { useClientValue } from "@app/hooks/useClientValue";

import InAppBrowserNotice from "./InAppBrowserNotice";

export type SocialSignInProps = {
  mode?: "signin" | "signup";
  // ログイン処理中（成功後のリダイレクト待ちを含む）かどうかを親に通知する
  onLoadingChange?: (isLoading: boolean) => void;
  // モーダル内で表示している場合に閉じるためのコールバック。
  // アプリ内ブラウザ案内でURLをコピーした後に呼ばれる。
  onClose?: () => void;
};

export default function SocialSignIn({
  mode = "signin",
  onLoadingChange,
  onClose,
}: SocialSignInProps) {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingX, setIsLoadingX] = useState(false);
  const [errorStatus, setErrorStatus] = useState<SignInErrorStatus | null>(null);
  // UserAgentはサーバ側では参照できないため、ハイドレーション後に実際の値へ差し替わる
  const isInApp = useClientValue(isInAppBrowser, false);

  useEffect(() => {
    onLoadingChange?.(isLoadingGoogle || isLoadingX);
  }, [isLoadingGoogle, isLoadingX, onLoadingChange]);

  const pathname = usePathname();

  // ログイン後の戻り先。ふだんは今いるページだが、ログインが要るページから飛ばされてきた
  // トップ(/?next=...)では、開こうとしていたページへ戻す(utils/signInReturn)。
  // URL は押した時点で読む(useSearchParams だと静的に描くページで Suspense 境界が要る)
  const returnPath = () => resolveSignInReturnPath(pathname, window.location.search);

  const googleProvider = new GoogleAuthProvider();
  const twitterProvider = new TwitterAuthProvider();

  const actionLabel = mode === "signup" ? "登録" : "ログイン";

  // アプリ内ブラウザ(WebView)ではGoogleがOAuthを拒否するため、
  // ソーシャルログインは提示せず外部ブラウザへの導線のみを表示する
  if (isInApp) {
    return <InAppBrowserNotice actionLabel={actionLabel} onCopied={onClose} />;
  }

  // キャンセルは利用者自身の操作(ポップアップを閉じた・認可を拒否した)なので、失敗と同じ赤い警告には
  // せず、通常色の小さな案内で「気づいている」ことだけ伝える
  const cancelledMessage =
    errorStatus === "cancelled" ? `${actionLabel}をキャンセルしました` : null;

  const errorMessage =
    errorStatus === "timeout"
      ? `${actionLabel}が完了しませんでした。もう一度お試しください`
      : errorStatus === "failed"
        ? `${actionLabel}に失敗しました。時間をおいて再度お試しください`
        : null;

  return (
    <div className="flex flex-col gap-3 w-full">
      <Button
        size="md"
        variant="bordered"
        fullWidth
        className="gap-0.5 border-default-200 font-medium"
        isLoading={isLoadingGoogle}
        isDisabled={isLoadingX}
        onPress={() =>
          handleSignIn(googleProvider, returnPath(), setIsLoadingGoogle, setErrorStatus)
        }
      >
        <FcGoogle className="text-xl shrink-0" />
        でつづける
      </Button>

      <Button
        size="md"
        variant="bordered"
        fullWidth
        className="gap-0.5 border-default-200 font-medium"
        isLoading={isLoadingX}
        isDisabled={isLoadingGoogle}
        onPress={() =>
          handleSignIn(twitterProvider, returnPath(), setIsLoadingX, setErrorStatus)
        }
      >
        <RiTwitterXLine className="text-xl shrink-0" />
        でつづける
      </Button>

      {/* 案内の行。出し入れでモーダルの高さが変わらないよう、1 行分(text-xs の行高 16px)を常に確保する。
          読み込み中の骨格(LazySocialSignIn の Placeholder)もこの分を含めた高さにしている */}
      <div className="min-h-4 text-center text-xs leading-4">
        {cancelledMessage && (
          <p role="status" className="text-default-500">
            {cancelledMessage}
          </p>
        )}

        {errorMessage && (
          <p role="alert" className="text-danger">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
