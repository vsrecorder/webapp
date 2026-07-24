"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, CardBody, Button, useDisclosure } from "@heroui/react";
import { LuFilePen, LuClipboardPaste } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import DeckCodeQuickStartModal from "@app/components/organisms/Deck/Modal/DeckCodeQuickStartModal";

type Props = {
  // GA 計測のラベル用。コホート限定はせず、登録週(7/13週か否か)の区別は計測に付与するだけ。
  cohortWeek?: string;
  daysSinceSignup?: number;
};

// 記録がまだ0件のユーザーに、ダッシュボード最上部で「最初の1件」を促す止血CTA（施策0-6）。
// 主導線は簡素化フォーム(/records/quick, 施策A-3)、副導線はデッキコードから始める
// クイックスタート(施策A-2)。表示条件（記録0件・トグル有効）はサーバー側(Dashboard.tsx)で
// 判定するため、このコンポーネントは「表示すると決まったとき」だけ描画される。
export default function FirstRecordCtaCard({ cohortWeek, daysSinceSignup }: Props) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // GA イベントの共通パラメータ。効果をコホート別に見られるようにしておく。
  const eventParams = {
    cohort_week: cohortWeek ?? "unknown",
    days_since_signup: daysSinceSignup ?? -1,
  };

  // 表示回数を計測（マウント時に1回）。
  useEffect(() => {
    sendGAEvent("event", "cta_first_record_impression", eventParams);
    // eventParams は cohortWeek/daysSinceSignup から導出しており、下記の依存で十分。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortWeek, daysSinceSignup]);

  function handlePrimaryClick() {
    sendGAEvent("event", "cta_first_record_click", eventParams);
  }

  function handleDeckCodeClick() {
    sendGAEvent("event", "cta_first_record_deckcode_click", eventParams);
    onOpen();
  }

  return (
    <>
      <Card className="shadow-md border-2 border-primary bg-primary/5">
        <CardBody className="p-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-primary tracking-wider">
              クイックスタート
            </span>
            <h2 className="text-lg font-bold">さっそく1戦目を記録しよう</h2>
            <p className="text-sm text-default-500">
              相手のデッキ名・先攻/後攻・勝敗だけでOK！
              <br />
              10秒で最初の記録を作成しよう。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button
              as={Link}
              href="/records/quick"
              color="primary"
              size="lg"
              radius="full"
              startContent={<LuFilePen className="w-4 h-4" />}
              className="font-bold shadow-md"
              onPress={handlePrimaryClick}
            >
              最初の記録を作成する
            </Button>
            <Button
              variant="light"
              color="primary"
              radius="full"
              startContent={<LuClipboardPaste className="w-4 h-4" />}
              className="font-bold"
              onPress={handleDeckCodeClick}
            >
              デッキ登録から始める
            </Button>
          </div>
        </CardBody>
      </Card>

      <DeckCodeQuickStartModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </>
  );
}
