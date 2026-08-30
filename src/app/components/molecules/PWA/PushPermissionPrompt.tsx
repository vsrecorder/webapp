"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button, addToast } from "@heroui/react";
import { LuBellRing, LuX } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import { usePushSubscription } from "@app/hooks/usePushSubscription";
import { UserStreakType } from "@app/types/streak";
import {
  consumeRecordCreatedTrigger,
  dismissPushPrompt,
  isPushPromptDismissed,
  type PushPromptSource,
} from "@app/utils/pushPrompt";

// ホームで出す条件: 連続記録がこの週数以上(継続の意思がある層)
const STREAK_WEEKS_FOR_PROMPT = 2;

// バナーに出す「何が届くのか」。実際に送っている3種類(月/金/日)と対応させる。
// プロフィールの「通知」カード(PushNotificationCard)の説明文と食い違わせないこと。
const PUSH_SCHEDULE: readonly (readonly [string, string])[] = [
  ["月", "先週の戦績・相棒デッキ・対戦相手"],
  ["金", "週末の記録忘れをリマインド"],
  ["日", "連続記録の途切れをお知らせ"],
] as const;

// ホーム画面追加バナーの状況。同じ位置に出るので重ねない(優先順位の判断は PwaBanners が持つ)。
//   none    … 出ないと分かっている
//   pending … beforeinstallprompt を待っていて、出るかどうかまだ分からない
//   visible … 出ている
export type InstallBannerState = "none" | "pending" | "visible";

type Props = {
  userId: string | null;
  installBannerState?: InstallBannerState;
};

/*
 * Web Push の許諾を求める自前のプロンプト(soft ask)。
 *
 * 初回訪問では絶対に出さない(B1_B2_PUSH_NOTIFICATION_PLAN.md D3)。出すのは次の2箇所だけ:
 *   - 記録作成の完了直後(遷移先の記録詳細ページ)。価値を体験した直後で最も同意されやすい
 *   - ホーム(ストリーク2週以上)。継続の意思がある層
 * 「あとで」は14日間再表示しない。ブラウザの許諾ダイアログは同意した人にだけ出す。
 *
 * iOS の Safari(非standalone)では PushManager が無いため何も出さず、
 * 既存の「ホーム画面に追加」バナーに任せる。
 *
 * Android のタブなど、ホーム画面追加バナーと条件が同時に揃う環境では出さない
 * (installBannerState。同じ位置に出るため。優先順位の判断は PwaBanners 側)。
 */
export default function PushPermissionPrompt({
  userId,
  installBannerState = "none",
}: Props) {
  const pathname = usePathname();
  const { ready, support, permission, subscribed, busy, subscribe } = usePushSubscription();
  const [source, setSource] = useState<PushPromptSource | null>(null);

  useEffect(() => {
    if (!userId || !ready) return;

    // 追加バナーが出るかどうかの判定中は何も決めない。ここで抜けるのは、下の
    // consumeRecordCreatedTrigger() まで進むと記録作成のトリガーを捨ててしまうため
    // (判定がついてから、出す/捨てるを決める)
    if (installBannerState === "pending") return;

    const eligible =
      installBannerState !== "visible" &&
      support === "supported" && permission === "default" && !subscribed && !isPushPromptDismissed();

    // 出せない状態では記録作成のトリガーも消費して捨てる(次に条件が揃ったとき、
    // 何週間も前の記録作成を根拠に突然出るのを防ぐ)
    const recordCreated = consumeRecordCreatedTrigger();
    if (!eligible) {
      setSource(null);
      return;
    }

    if (recordCreated) {
      setSource("record_created");
      return;
    }

    if (pathname !== "/") {
      setSource(null);
      return;
    }

    let cancelled = false;
    fetch(`/api/users/${userId}/streak`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((streak: UserStreakType | null) => {
        if (cancelled) return;
        setSource(
          streak && streak.current_weeks >= STREAK_WEEKS_FOR_PROMPT ? "streak" : null,
        );
      })
      .catch(() => {
        if (!cancelled) setSource(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, ready, support, permission, subscribed, pathname, installBannerState]);

  useEffect(() => {
    if (source) {
      sendGAEvent("event", "push_prompt_impression", { source });
    }
  }, [source]);

  if (!source) return null;

  const handleAccept = async () => {
    const current = source;
    const ok = await subscribe();
    if (ok) {
      sendGAEvent("event", "push_prompt_accept", { source: current });
      addToast({
        title: "通知を受け取る設定にしました",
        description: "解除はプロフィールの「通知」からいつでもできます",
        color: "success",
        timeout: 4000,
      });
    } else {
      // ブラウザの許諾ダイアログを閉じた／ブロックした／登録に失敗した。
      // 同じセッションで何度も出すと許諾取り消しの最短経路になるため、「あとで」と同じ扱いにする
      // (許可済みで登録だけ失敗した場合は、次回訪問時の再同期がサーバ側を直す)
      dismissPushPrompt();
      // 拒否(denied)・ダイアログを閉じた(default)・技術的失敗(granted なのに失敗)を分けて読めるようにする
      sendGAEvent("event", "push_prompt_reject", { source: current, permission: Notification.permission });
      addToast({
        title: "通知を設定できませんでした",
        description:
          Notification.permission === "denied"
            ? "ブラウザで通知がブロックされています。ブラウザの設定から許可できます"
            : "しばらくしてからプロフィールの「通知」でもう一度お試しください",
        color: "warning",
        timeout: 5000,
      });
    }
    setSource(null);
  };

  const handleDismiss = () => {
    dismissPushPrompt();
    sendGAEvent("event", "push_prompt_dismiss", { source });
    setSource(null);
  };

  return (
    // モバイルでの位置はホーム画面追加バナーと同じ(同時には出ない。PwaBanners 参照)。
    // ホーム画面追加バナーと違いデスクトップ(Chrome/Edge)でも push は受け取れるので隠さず、
    // 下部ナビが無い lg 以上では右下に寄せる。
    <div className="fixed z-50 bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.5rem)] left-2 right-2 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[26rem] rounded-2xl bg-content1/95 backdrop-blur-md shadow-xl border border-divider">
      {/* 高さを抑えるため、CTA は独立した行にせずリストの右へ回す(右下の位置は保つ)。
          左カラムが「何がいつ届くか」、右下が操作、という2ブロックだけの構成 */}
      <div className="relative px-4 py-2.5">
        {/* 閉じるは右上に絶対配置し、文言の行から追い出す(文言の幅を削らないため) */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          radius="full"
          aria-label="あとで"
          className="absolute top-0.5 right-0.5 text-default-400 hover:text-default-600"
          onPress={handleDismiss}
        >
          <LuX className="w-4 h-4" />
        </Button>

        {/* 導線(記録直後 / ホーム)によらず、訴求は「先週のバトルレポートが届く」に揃える。
            pr-8 は右上の閉じるボタンぶんの逃げ(タイトルが折り返しても重ならない) */}
        <div className="flex items-center gap-2 pr-8">
          <span className="w-5 h-5 rounded-md bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
            <LuBellRing className="w-3 h-3" />
          </span>
          <p className="text-sm font-semibold text-default-900 leading-tight">
            先週のバトルレポートを通知で受け取る
          </p>
        </div>

        {/* items-end で CTA を左カラムの下端に揃える = 見た目は右下のまま、行数ぶんの高さを食わない */}
        <div className="flex items-end gap-2 mt-1.5">
          {/* 何がいつ届くのかを曜日ごとに開示する。「通知が増える」不安がいちばんの離脱要因なので、
              種類と頻度を先に見せる(プロフィールの「通知」カードの説明と内容を揃えること)。
              pl-6/-indent-6 はぶら下げインデント。狭い端末で折り返しても曜日の下に潜り込まない */}
          <ul className="flex-1 min-w-0">
            {PUSH_SCHEDULE.map(([day, text]) => (
              <li key={day} className="text-xs text-default-500 leading-snug pl-6 -indent-6">
                <span className="font-bold text-default-600">
                  {day}
                  <span className="sr-only">曜</span>
                </span>
                <span className="mx-1.5 text-default-300" aria-hidden="true">
                  |
                </span>
                {text}
              </li>
            ))}
          </ul>

          <Button
            size="sm"
            color="primary"
            radius="full"
            className="font-semibold shrink-0"
            isLoading={busy}
            onPress={handleAccept}
          >
            受け取る
          </Button>
        </div>
      </div>
    </div>
  );
}
