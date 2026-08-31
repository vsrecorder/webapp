"use client";

import { useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";

import { useState } from "react";

import { useInstallPrompt } from "@app/hooks/useInstallPrompt";
import AcquisitionSurveyPrompt from "@app/components/molecules/PWA/AcquisitionSurveyPrompt";
import AddToHomeScreenBanner from "@app/components/molecules/PWA/AddToHomeScreenBanner";
import PushPermissionPrompt, {
  type InstallBannerState,
} from "@app/components/molecules/PWA/PushPermissionPrompt";

/*
 * 画面下部に出るバナー(登録時アンケート / ホーム画面に追加 / Web Push の soft ask)の交通整理。
 *
 * 登録時アンケート(施策0-4 S4)は最優先で出す。新規登録の直後しか訊けない
 * 時限性があり(記憶が薄れる)、1タップで消える最も軽いバナーでもあるため。
 * アンケートが出ている間は他の2枚を出さない。
 *
 * どちらも同じ位置・同じ幅に fixed で出るため、条件が同時に揃うと重なる
 * (Android の Chrome タブで起きる。iOS は support 判定で排他になっている)。
 * ここで useInstallPrompt を1つだけ持ち、追加バナーが出ているあいだは push を出さない。
 *
 * インストールを優先するのは、
 *   - iOS はホーム画面に追加しないと Web Push を受け取れない(usePushSubscription の support 判定)
 *   - Android もインストール済みのほうが通知が安定して届く
 * ため。インストールを先に済ませてもらうほうが、通知の導線としても素直になる。
 */

// AddToHomeScreenBanner の lg:hidden と同じ境界(Tailwind の lg = 64rem)。
// lg 以上では追加バナーが CSS で消えるので、その状態を JS 側でも知る必要がある。
const LG_UP_QUERY = "(min-width: 64rem)";

function useIsLgUp(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(LG_UP_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(LG_UP_QUERY).matches,
    // サーバでは幅が分からない。追加バナーが出る側(モバイル)を初期値にして、
    // マウント後の実測で上書きする
    () => false,
  );
}

type Props = {
  iconUrl: string;
  userId: string | null;
};

export default function PwaBanners({ iconUrl, userId }: Props) {
  const { status } = useSession();
  const { installState, install, dismiss, awaitingInstallEvent } = useInstallPrompt();
  const isLgUp = useIsLgUp();
  const [surveyOpen, setSurveyOpen] = useState(false);

  // 追加バナーが実際に見えるか。lg 以上は lg:hidden で出ないので "none" 扱いにする
  // (デスクトップの Chrome / Edge でも push は受け取れるため、そちらは止めない)。
  // 発火待ちの "pending" を分けているのは、push 側がこの間に記録作成のトリガーを
  // 消費してしまわないようにするため
  const authenticated = status === "authenticated";
  const installBannerState: InstallBannerState =
    !authenticated || isLgUp
      ? "none"
      : installState !== "idle"
        ? "visible"
        : awaitingInstallEvent
          ? "pending"
          : "none";

  return (
    <>
      {/* 登録時アンケート(施策0-4 S4)。新規登録直後のフラグがある間だけ出る */}
      <AcquisitionSurveyPrompt userId={userId} onOpenChange={setSurveyOpen} />
      {!surveyOpen && (
        <AddToHomeScreenBanner
          iconUrl={iconUrl}
          installState={installState}
          onInstall={install}
          onDismiss={dismiss}
        />
      )}
      {/* Web Push の soft ask(B-1)。記録作成直後とストリーク2週以上のホームでだけ出る。
          アンケート表示中はマウントしない(マウントすると記録作成のトリガーを消費してしまう) */}
      {!surveyOpen && (
        <PushPermissionPrompt userId={userId} installBannerState={installBannerState} />
      )}
    </>
  );
}
