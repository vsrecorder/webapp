"use client";

import { Button, Card, CardBody, addToast } from "@heroui/react";
import { LuBellOff, LuBellRing } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import { usePushSubscription } from "@app/hooks/usePushSubscription";
import { isInAppBrowser } from "@app/utils/platform";

/*
 * プロフィールの「通知」カード(B-1)。
 *
 * 受け取る/解除の両方をここに置く。解除できない通知はブラウザ設定での「ブロック」に化けて
 * 回復不能になるため、解除導線は許諾UIと同時に用意する(B1_B2_PUSH_NOTIFICATION_PLAN.md §5.4b)。
 */
export default function PushNotificationCard() {
  const { ready, support, permission, subscribed, busy, subscribe, unsubscribe } =
    usePushSubscription();

  if (!ready) return null;

  let status: string;
  let action: "subscribe" | "unsubscribe" | null = null;

  if (support === "ios-needs-install") {
    // LINE や X のアプリ内ブラウザには「ホーム画面に追加」が無いので、その手順は案内しない
    status = isInAppBrowser()
      ? "iPhone / iPad では、ホーム画面に追加したアプリからのみ通知を受け取れます。このページを Safari で開いてから「共有」→「ホーム画面に追加」をしてください。"
      : "iPhone / iPad では、ホーム画面に追加したアプリからのみ通知を受け取れます。「共有」→「ホーム画面に追加」で開き直してください。";
  } else if (support === "unsupported") {
    status = "このブラウザは通知に対応していません。";
  } else if (permission === "denied") {
    status =
      "ブラウザで通知がブロックされています。ブラウザの設定でこのサイトの通知を許可すると受け取れます。";
  } else if (subscribed) {
    status = "この端末で受け取っています。";
    action = "unsubscribe";
  } else {
    status = "この端末ではまだ受け取っていません。";
    action = "subscribe";
  }

  const handleSubscribe = async () => {
    const ok = await subscribe();
    sendGAEvent("event", ok ? "push_prompt_accept" : "push_prompt_reject", {
      source: "profile",
      // 拒否(denied)・ダイアログを閉じた(default)・技術的失敗(granted なのに失敗)を分けて読めるようにする
      permission: Notification.permission,
    });
    addToast(
      ok
        ? { title: "通知を受け取る設定にしました", color: "success", timeout: 3000 }
        : {
            title: "通知を設定できませんでした",
            description:
              Notification.permission === "denied"
                ? "ブラウザで通知がブロックされています"
                : "しばらくしてからもう一度お試しください",
            color: "warning",
            timeout: 4000,
          },
    );
  };

  const handleUnsubscribe = async () => {
    const ok = await unsubscribe();
    sendGAEvent("event", "push_unsubscribe", { source: "profile" });
    addToast(
      ok
        ? { title: "通知を解除しました", color: "success", timeout: 3000 }
        : { title: "解除に失敗しました", color: "danger", timeout: 3000 },
    );
  };

  return (
    <Card className="shadow-md">
      <CardBody className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          {subscribed ? (
            <LuBellRing className="w-5 h-5 text-primary shrink-0" />
          ) : (
            <LuBellOff className="w-5 h-5 text-default-400 shrink-0" />
          )}
          <span className="text-sm font-bold text-foreground">通知</span>
        </div>

        <p className="text-xs leading-relaxed text-default-500">
          先週のバトルレポート(月曜)・週末の記録リマインド(金曜)・連続記録の途切れ防止(日曜)を、
          端末の通知でお知らせします。{status}
        </p>

        {action === "subscribe" && (
          <Button color="primary" radius="full" className="font-semibold" isLoading={busy} onPress={handleSubscribe}>
            この端末で受け取る
          </Button>
        )}
        {action === "unsubscribe" && (
          <Button variant="bordered" radius="full" className="font-semibold text-default-600" isLoading={busy} onPress={handleUnsubscribe}>
            この端末の通知を解除する
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
