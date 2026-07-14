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

import InAppBrowserNotice from "./InAppBrowserNotice";

type Props = {
  mode?: "signin" | "signup";
  // ログイン処理中（成功後のリダイレクト待ちを含む）かどうかを親に通知する
  onLoadingChange?: (isLoading: boolean) => void;
};

export default function SocialSignIn({ mode = "signin", onLoadingChange }: Props) {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingX, setIsLoadingX] = useState(false);
  const [errorStatus, setErrorStatus] = useState<SignInErrorStatus | null>(null);
  // UserAgentはサーバ側では参照できないため、マウント後に判定する
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    setIsInApp(isInAppBrowser());
  }, []);

  useEffect(() => {
    onLoadingChange?.(isLoadingGoogle || isLoadingX);
  }, [isLoadingGoogle, isLoadingX, onLoadingChange]);

  const redirectPathname = usePathname();

  const googleProvider = new GoogleAuthProvider();
  const twitterProvider = new TwitterAuthProvider();

  const actionLabel = mode === "signup" ? "登録" : "ログイン";

  // アプリ内ブラウザ(WebView)ではGoogleがOAuthを拒否するため、
  // ソーシャルログインは提示せず外部ブラウザへの導線のみを表示する
  if (isInApp) {
    return <InAppBrowserNotice actionLabel={actionLabel} />;
  }

  const errorMessage =
    errorStatus === "cancelled"
      ? `${actionLabel}がキャンセルされました`
      : errorStatus === "timeout"
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
          handleSignIn(
            googleProvider,
            redirectPathname,
            setIsLoadingGoogle,
            setErrorStatus,
          )
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
          handleSignIn(twitterProvider, redirectPathname, setIsLoadingX, setErrorStatus)
        }
      >
        <RiTwitterXLine className="text-xl shrink-0" />
        でつづける
      </Button>

      {errorMessage && (
        <p role="alert" className="text-center text-xs text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
