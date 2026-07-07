"use client";

import Image from "next/image";
import { Button } from "@heroui/react";
import { LuX } from "react-icons/lu";
import { useSession } from "next-auth/react";

import { useInstallPrompt } from "@app/hooks/useInstallPrompt";

export default function AddToHomeScreenBanner({ iconUrl }: { iconUrl: string }) {
  const { status } = useSession();
  const { installState, install, dismiss } = useInstallPrompt();

  if (status !== "authenticated") return null;
  if (installState === "idle") return null;

  return (
    <div className="lg:hidden fixed z-40 bottom-16 left-2 right-2 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xl border border-default-200/60 dark:border-neutral-700/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <Image
          src={iconUrl}
          alt="バトレコ アイコン"
          width={44}
          height={44}
          className="rounded-xl shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-default-900 dark:text-white leading-tight">
            ホーム画面に追加
          </p>
          {installState === "ios" ? (
            <p className="text-xs text-default-500 dark:text-neutral-400 leading-snug mt-0.5">
              「共有」→「ホーム画面に追加」でアプリとして使えます
            </p>
          ) : (
            <p className="text-xs text-default-500 dark:text-neutral-400 leading-snug mt-0.5">
              アプリとしてインストールすると快適に使えます
            </p>
          )}
        </div>

        {installState === "android" && (
          <Button
            size="sm"
            color="primary"
            radius="full"
            className="shrink-0 font-semibold"
            onPress={install}
          >
            追加
          </Button>
        )}

        <Button
          isIconOnly
          size="sm"
          variant="light"
          radius="full"
          aria-label="バナーを閉じる"
          className="shrink-0 text-default-400 hover:text-default-600"
          onPress={dismiss}
        >
          <LuX className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
