"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ModalContent, ModalBody, Button } from "@heroui/react";
import { LuFilePen, LuClipboardPaste, LuRocket } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import { Modal } from "@app/components/atoms/AppModal";
import DeckCodeQuickStartModal from "@app/components/organisms/Deck/Modal/DeckCodeQuickStartModal";

// 閉じてから再表示しない期間。PWAインストールバナー(useInstallPrompt)と同じ流儀・同じ長さ。
const DISMISS_KEY = "quick_start_modal_dismissed_at";
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

type Props = {
  // GA 計測のラベル用。コホート限定はせず、登録週の区別は計測に付与するだけ(FirstRecordCtaCard と同じ)。
  cohortWeek?: string;
  daysSinceSignup?: number;
};

// 記録がまだ0件のユーザーがホーム(ダッシュボード)を開いたときに、最初の1件への導線を
// 自動で前に出すモーダル。中身は FirstRecordCtaCard と同じ2導線:
//  ・主導線: 簡素化フォーム(/records/quick, 施策A-3)
//  ・副導線: デッキコードから始めるクイックスタート(施策A-2)
//
// 表示条件（記録0件・トグル有効）はサーバー側(Dashboard.tsx)で判定するため、このコンポーネントは
// 「表示すると決まったとき」だけ描画される。ここで見るのは再表示の間隔だけ。
// カード(FirstRecordCtaCard)は常設の導線として残るので、モーダルを閉じても行き先は消えない。
export default function QuickStartModal({ cohortWeek, daysSinceSignup }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeckCodeOpen, setIsDeckCodeOpen] = useState(false);

  // GA イベントの共通パラメータ。効果をコホート別に見られるようにしておく。
  const eventParams = {
    cohort_week: cohortWeek ?? "unknown",
    days_since_signup: daysSinceSignup ?? -1,
  };

  useEffect(() => {
    let dismissedAt: string | null = null;
    try {
      dismissedAt = localStorage.getItem(DISMISS_KEY);
    } catch {
      // プライベートモード等で localStorage が読めない場合は抑止せず表示する
    }
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) return;

    // 「一度出したら3日空ける」。閉じる操作を待たずに開いた時点で記録するのは、
    // 閉じずにリロードした場合や別ページへ移って戻った場合に毎回出てしまうのを防ぐため。
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 書き込めない環境では抑止できないが、表示自体は妨げない
    }

    setIsOpen(true);
    sendGAEvent("event", "quickstart_modal_impression", eventParams);
    // eventParams は cohortWeek/daysSinceSignup から導出しており、下記の依存で十分。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortWeek, daysSinceSignup]);

  // 主導線(簡素化フォームへ遷移)。遷移自体は Link に任せる。
  function handleRecordClick() {
    sendGAEvent("event", "quickstart_modal_record_click", eventParams);
  }

  // 副導線。案内モーダルを閉じてからデッキ登録モーダルへ入れ替える(2枚重ねにしない)。
  function handleDeckCodeClick() {
    sendGAEvent("event", "quickstart_modal_deckcode_click", eventParams);
    setIsOpen(false);
    setIsDeckCodeOpen(true);
  }

  function handleDismiss() {
    sendGAEvent("event", "quickstart_modal_dismiss", eventParams);
    setIsOpen(false);
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        size="sm"
        placement="center"
        scrollBehavior="inside"
        // 自動で出るモーダルなので、モーダル外のタップでは閉じない。
        // 記録に進むか「あとで」「×」で明示的に閉じるかを選ばせる(誤タップで消えるのを防ぐ)。
        isDismissable={false}
        onOpenChange={(open) => {
          // Esc・×ボタンからの閉じる操作もここに集約する
          if (!open) handleDismiss();
        }}
        classNames={{
          // モバイル幅では画面いっぱいに広げ、デスクトップ幅では横に伸びすぎないよう抑える
          base: "sm:max-w-full lg:max-w-md max-h-[calc(100%-3rem)]",
          closeButton: "text-xl",
        }}
      >
        <ModalContent>
          <ModalBody className="px-5 py-6 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary tracking-wider">
                <LuRocket className="w-3.5 h-3.5" />
                クイックスタート
              </span>
              <h2 className="text-lg font-bold leading-snug">さっそく1戦目を記録しよう</h2>
              <p className="text-sm text-default-500 leading-relaxed">
                相手のデッキ名・先攻/後攻・勝敗だけでOK！
                <br />
                10秒で最初の記録を作成しよう。
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                as={Link}
                href="/records/quick"
                color="primary"
                radius="lg"
                startContent={<LuFilePen className="w-4 h-4" />}
                className="font-bold h-12 shadow-md"
                onPress={handleRecordClick}
              >
                最初の記録を作成する
              </Button>
              <Button
                color="primary"
                variant="flat"
                radius="lg"
                startContent={<LuClipboardPaste className="w-4 h-4" />}
                className="font-bold h-11"
                onPress={handleDeckCodeClick}
              >
                デッキ登録から始める
              </Button>
              <Button
                variant="light"
                radius="lg"
                className="font-bold text-default-500 h-10"
                onPress={handleDismiss}
              >
                あとで
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <DeckCodeQuickStartModal
        isOpen={isDeckCodeOpen}
        onOpenChange={() => setIsDeckCodeOpen((v) => !v)}
      />
    </>
  );
}
