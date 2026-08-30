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

type Props = {
  userId: string | null;
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
 */
export default function PushPermissionPrompt({ userId }: Props) {
  const pathname = usePathname();
  const { ready, support, permission, subscribed, busy, subscribe } = usePushSubscription();
  const [source, setSource] = useState<PushPromptSource | null>(null);

  useEffect(() => {
    if (!userId || !ready) return;

    const eligible =
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
  }, [userId, ready, support, permission, subscribed, pathname]);

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
    // モバイルでは位置とサイズをホーム画面追加バナーと同じにし、両方が同時に条件を満たす端末では
    // こちらを前面(z-60)に出す(こちらは明示的なきっかけがあるときしか出ないため)。
    // ホーム画面追加バナーと違いデスクトップ(Chrome/Edge)でも push は受け取れるので隠さず、
    // 下部ナビが無い lg 以上では右下に寄せる。
    <div className="fixed z-60 bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.5rem)] left-2 right-2 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[26rem] rounded-2xl bg-content1/95 backdrop-blur-md shadow-xl border border-divider">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <LuBellRing className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-default-900 leading-tight">
            {source === "record_created"
              ? "先週のバトルレポートを通知で受け取る"
              : "連続記録がとぎれそうなときにお知らせ"}
          </p>
          <p className="text-xs text-default-500 leading-snug mt-0.5">
            週次レポート・週末リマインド・連続記録の途切れ防止をお知らせします
          </p>
        </div>

        <Button
          size="sm"
          color="primary"
          radius="full"
          className="shrink-0 font-semibold"
          isLoading={busy}
          onPress={handleAccept}
        >
          受け取る
        </Button>

        <Button
          isIconOnly
          size="sm"
          variant="light"
          radius="full"
          aria-label="あとで"
          className="shrink-0 text-default-400 hover:text-default-600"
          onPress={handleDismiss}
        >
          <LuX className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
