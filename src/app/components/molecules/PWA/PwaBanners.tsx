"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";

import { useInstallPrompt } from "@app/hooks/useInstallPrompt";
import { consumeRecordCreatedTrigger } from "@app/utils/pushPrompt";
import AcquisitionSurveyPrompt from "@app/components/molecules/PWA/AcquisitionSurveyPrompt";
import AddToHomeScreenBanner from "@app/components/molecules/PWA/AddToHomeScreenBanner";
import PushPermissionPrompt, {
  type InstallBannerState,
} from "@app/components/molecules/PWA/PushPermissionPrompt";

/*
 * 画面下部に出るバナー(登録時アンケート / ホーム画面に追加 / Web Push の soft ask)の交通整理。
 *
 * まず、デスクトップ幅(lg 以上)では PWA / 通知の2枚を出さない。画面下部に浮くバナーは
 * 下部ナビの上に重ねるモバイル前提の見た目で、広い画面では作業領域を覆う異物になる。
 * デスクトップの Chrome / Edge でも Web Push 自体は受け取れるが、そちらはプロフィールの
 * 「通知」カード(PushNotificationCard)から設定できるので導線は塞がない。
 *
 * 登録時アンケート(施策0-4 S4)だけは lg 以上でも出す。流入元の把握が目的で
 * PWA / 通知とは別の施策であり、PC で登録した人を落とすと自己申告の母数がそのまま欠ける
 * (utm-attribution-plan.md §3.6)。訊けるのは新規登録の直後だけで撮り直しが効かない。
 *
 * その時限性から、lg 未満でもアンケートを最優先で出す。1タップで消える最も軽い
 * バナーでもあるため、アンケートが出ている間は他の2枚を出さない。
 *
 * 残り2枚も同じ位置・同じ幅に fixed で出るため、条件が同時に揃うと重なる
 * (Android の Chrome タブで起きる。iOS は support 判定で排他になっている)。
 * ここで useInstallPrompt を1つだけ持ち、追加バナーが出ているあいだは push を出さない。
 *
 * インストールを優先するのは、
 *   - iOS はホーム画面に追加しないと Web Push を受け取れない(usePushSubscription の support 判定)
 *   - Android もインストール済みのほうが通知が安定して届く
 * ため。インストールを先に済ませてもらうほうが、通知の導線としても素直になる。
 */

// PWA / 通知の2枚を出す/出さないの境界(Tailwind の lg = 64rem)。
// 3枚の表示判定はこのファイルに集約してあるので、子側に lg: の打ち消しは置かない。
const LG_UP_QUERY = "(min-width: 64rem)";

function useIsLgUp(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(LG_UP_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(LG_UP_QUERY).matches,
    // サーバでは幅が分からない。バナーが出る側(モバイル)を初期値にして、
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

  // デスクトップ幅では記録作成のトリガー(sessionStorage)をここで捨てる。
  // 残したままだと、ウィンドウを lg 未満へ縮めた瞬間に、何時間も前の記録作成を
  // 根拠に push の soft ask が突然出る(PushPermissionPrompt 側の消費と同じ考え方)
  useEffect(() => {
    if (isLgUp) consumeRecordCreatedTrigger();
  }, [isLgUp]);

  // 追加バナーが実際に見えるか。発火待ちの "pending" を分けているのは、
  // push 側がこの間に記録作成のトリガーを消費してしまわないようにするため
  const authenticated = status === "authenticated";
  const installBannerState: InstallBannerState = !authenticated
    ? "none"
    : installState !== "idle"
      ? "visible"
      : awaitingInstallEvent
        ? "pending"
        : "none";

  // PWA / 通知の2枚はモバイル幅でだけ出す
  const showPwaBanners = !isLgUp && !surveyOpen;

  return (
    <>
      {/* 登録時アンケート(施策0-4 S4)。新規登録直後のフラグがある間だけ出る。
          これだけは幅によらず出す(PC 登録者の回答を落とさないため) */}
      <AcquisitionSurveyPrompt userId={userId} onOpenChange={setSurveyOpen} />
      {showPwaBanners && (
        <AddToHomeScreenBanner
          iconUrl={iconUrl}
          installState={installState}
          onInstall={install}
          onDismiss={dismiss}
        />
      )}
      {/* Web Push の soft ask(B-1)。記録作成直後とストリーク2週以上のホームでだけ出る。
          アンケート表示中はマウントしない(マウントすると記録作成のトリガーを消費してしまう) */}
      {showPwaBanners && (
        <PushPermissionPrompt userId={userId} installBannerState={installBannerState} />
      )}
    </>
  );
}
