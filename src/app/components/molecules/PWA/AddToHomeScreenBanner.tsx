"use client";

import Image from "next/image";

import BottomBanner from "@app/components/molecules/BottomBanner";
import { Button } from "@heroui/react";
import { useEffect } from "react";

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
  /*
   * 表示状態の変化を親(PwaBanners)へ知らせる。画面下の帯は同時に1枚しか出さないので、
   * 親はこれを見て優先度の低いもの(記録中バー)を抑止する。
   */
  onOpenChange?: (open: boolean) => void;
};

export default function AddToHomeScreenBanner({
  iconUrl,
  installState,
  onInstall,
  onDismiss,
  onOpenChange,
}: Props) {
  const { status } = useSession();

  const open = status === "authenticated" && installState !== "idle";

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <BottomBanner dismissLabel="バナーを閉じる" onDismiss={onDismiss}>
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
      </div>
    </BottomBanner>
  );
}
