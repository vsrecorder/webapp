"use client";

import React, { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { TwitterAuthProvider, GoogleAuthProvider } from "firebase/auth";

import { Button } from "@heroui/react";

import { FcGoogle } from "react-icons/fc";
import { RiTwitterXLine } from "react-icons/ri";

import { handleSignIn } from "@app/handlers/handleSignIn";
import type { SignInErrorStatus } from "@app/handlers/handleSignIn";

type Props = {
  mode?: "signin" | "signup";
  // ログイン処理中（成功後のリダイレクト待ちを含む）かどうかを親に通知する
  onLoadingChange?: (isLoading: boolean) => void;
};

export default function SocialSignIn({ mode = "signin", onLoadingChange }: Props) {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingX, setIsLoadingX] = useState(false);
  const [errorStatus, setErrorStatus] = useState<SignInErrorStatus | null>(null);

  useEffect(() => {
    onLoadingChange?.(isLoadingGoogle || isLoadingX);
  }, [isLoadingGoogle, isLoadingX, onLoadingChange]);

  const redirectPathname = usePathname();

  const googleProvider = new GoogleAuthProvider();
  const twitterProvider = new TwitterAuthProvider();

  const actionLabel = mode === "signup" ? "登録" : "ログイン";
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
        className="gap-2 border-default-200 font-medium"
        isLoading={isLoadingGoogle}
        onPress={() => handleSignIn(googleProvider, redirectPathname, setIsLoadingGoogle, setErrorStatus)}
      >
        <FcGoogle className="text-xl shrink-0" />
        Googleでつづける
      </Button>

      <Button
        size="md"
        variant="bordered"
        fullWidth
        className="gap-2 border-default-200 font-medium"
        isLoading={isLoadingX}
        onPress={() => handleSignIn(twitterProvider, redirectPathname, setIsLoadingX, setErrorStatus)}
      >
        <RiTwitterXLine className="text-xl shrink-0" />
        Xでつづける
      </Button>

      {errorMessage && (
        <p role="alert" className="text-center text-xs text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
