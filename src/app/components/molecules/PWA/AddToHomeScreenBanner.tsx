"use client";

import Image from "next/image";
import { Button } from "@heroui/react";
import { LuX } from "react-icons/lu";
import { useSession } from "next-auth/react";

import { InstallState } from "@app/hooks/useInstallPrompt";

/*
 * インストール状態は PwaBanners が useInstallPrompt を1つだけ持って渡す。
 * ここで自前に useInstallPrompt を呼ぶと状態が2つに分かれ、
 * このバナーを閉じても push 側は「まだ出ている」と誤認する。
 *
 * デスクトップ幅(lg 以上)で出さない判定も PwaBanners が持つ(下部バナー3枚で共通)。
 * ここに lg:hidden は置かない。
 */
type Props = {
  iconUrl: string;
  installState: InstallState;
  onInstall: () => void;
  onDismiss: () => void;
};

export default function AddToHomeScreenBanner({
  iconUrl,
  installState,
  onInstall,
  onDismiss,
}: Props) {
  const { status } = useSession();

  if (status !== "authenticated") return null;
  if (installState === "idle") return null;

  return (
    <div className="fixed z-50 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+0.5rem)] left-2 right-2 rounded-2xl bg-content1/95 backdrop-blur-md shadow-xl border border-divider">
      <div className="flex items-center gap-3 px-4 py-3">
        <Image
          src={iconUrl}
          alt="バトレコ アイコン"
          width={44}
          height={44}
          className="rounded-xl shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-default-900 leading-tight">
            ホーム画面に追加
          </p>
          {installState === "ios" ? (
            <p className="text-xs text-default-500 leading-snug mt-0.5">
              「共有」→「ホーム画面に追加」でアプリとして使えます
            </p>
          ) : (
            <p className="text-xs text-default-500 leading-snug mt-0.5">
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
            onPress={onInstall}
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
          onPress={onDismiss}
        >
          <LuX className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
