"use client";

import { useEffect, useState } from "react";
import { Button, addToast } from "@heroui/react";
import { LuX } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import {
  ACQUISITION_SURVEY_CHOICES,
  clearAcquisitionSurveyPending,
  isAcquisitionSurveyPending,
} from "@app/utils/acquisitionSurvey";

type Props = {
  userId: string | null;
  // 表示状態の変化を親(PwaBanners)へ通知する。ホーム画面追加バナー・push の
  // soft ask と同じ位置に出るため、出ている間は親がそれらを抑止する。
  onOpenChange?: (open: boolean) => void;
};

/*
 * 登録時アンケート「どこでバトレコを知りましたか？」(施策0-4 S4)。
 *
 * UTM は「タグ付きリンクを踏んだ人」しか捕捉できないため、流入元の判明率70%は
 * この自己申告で埋める(utm-attribution-plan.md §3.6)。訊くのは新規登録の直後だけ:
 * handleSignIn が isNewUser のときに立てたフラグ(localStorage)がある間しか出ない。
 * 回答・スキップのどちらでもフラグを消し、二度と訊かない(任意回答・1回きり)。
 */
export default function AcquisitionSurveyPrompt({ userId, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // localStorage は SSR で読めないため、表示判定はマウント後に行う
  useEffect(() => {
    if (!userId) return;
    if (!isAcquisitionSurveyPending()) return;

    setOpen(true);
    sendGAEvent("event", "acq_survey_impression", {});
  }, [userId]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  if (!open) return null;

  const close = () => setOpen(false);

  const handleAnswer = async (answer: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/users/acquisition/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });

      if (res.ok) {
        sendGAEvent("event", "acq_survey_answer", { answer });
        clearAcquisitionSurveyPending();
        addToast({
          title: "ありがとうございます",
          description: "今後の改善の参考にします",
          color: "success",
          timeout: 3000,
        });
        close();
        return;
      }

      // 4xx はリトライしても通らない(壊れたリクエスト等)。フラグを消して打ち切る
      if (res.status >= 400 && res.status < 500) {
        clearAcquisitionSurveyPending();
        close();
        return;
      }

      // 5xx はサーバ側の一時障害の可能性があるので、フラグを残して次の訪問時に訊き直す
      close();
    } catch {
      // 回線エラーも同様に、次の訪問時へ持ち越す
      close();
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    sendGAEvent("event", "acq_survey_dismiss", {});
    clearAcquisitionSurveyPending();
    close();
  };

  return (
    // 見た目は PushPermissionPrompt に合わせる(同じ場所に出る仲間として認知させる)。
    // このバナーは lg 以上でも出る(PwaBanners 参照)ため、下部ナビが無いデスクトップでは
    // 全幅に伸ばさず右下に寄せる
    <div className="fixed z-50 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+0.5rem)] left-2 right-2 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[26rem] rounded-2xl bg-content1/95 backdrop-blur-md shadow-xl border border-divider">
      <div className="relative px-4 py-2.5">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          radius="full"
          aria-label="スキップ"
          className="absolute top-0.5 right-0.5 text-default-400 hover:text-default-600"
          onPress={handleDismiss}
        >
          <LuX className="w-4 h-4" />
        </Button>

        <p className="text-sm font-semibold text-default-900 leading-tight pr-8">
          どこでバトレコを知りましたか？
        </p>
        <p className="text-xs text-default-500 mt-0.5">1タップで完了します</p>

        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {ACQUISITION_SURVEY_CHOICES.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant="flat"
              radius="full"
              className="font-medium"
              isDisabled={busy}
              onPress={() => void handleAnswer(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
