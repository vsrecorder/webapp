"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@heroui/react";
import { LuChevronRight, LuFilePen, LuX } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import { writeClientCookie } from "@app/utils/clientCookie";
import { dropBlocksFromStoredLayout } from "@app/utils/dashboardLayoutClient";
import { ACTIVITY_WINBACK_CARD, sendDailyActivity } from "@app/utils/dailyActivity";
import { weekRangeLabel } from "@app/utils/week";
import {
  WINBACK_DISMISSED_COOKIE,
  WINBACK_DISMISSED_COOKIE_MAX_AGE,
} from "@app/utils/winback";

type Props = {
  // 最後に対戦した週の月曜 "YYYY-MM-DD"
  lastWeek: string;
  // そのあと対戦の無かった週の数(4以上)
  emptyWeeks: number;
  // いまの対戦環境。名前はマスタから出す(決め打ちしない。次の切り替わりでもそのまま使える)
  environmentTitle: string;
  // いまの環境の開始日 "YYYY-MM-DD"
  environmentFrom: string;
  // 最後に対戦した週が属する、終わった環境。いまの環境と同じなら null(導線を出さない)
  lastEnvironment: { id: string; title: string } | null;
};

// "YYYY-MM-DD" → "M/D"
function monthDay(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

/*
 * 直前の4週すべてで対戦していない人に、ホーム最上部で記録の再開を促すカード
 * (施策D-4 ウィンバック・D4_WINBACK_PLAN.md §3)。
 *
 * 出す条件(空いた週数・記録0件でない・記録中でない・閉じた直後でない)はサーバ側
 * (Dashboard.tsx → utils/winback)で判定するので、ここは「出すと決まったとき」だけ描画される。
 * 記録すると last_recorded_week が更新されて自然に消える。× で閉じたら7日間出さない。
 */
export default function WinbackCard({
  lastWeek,
  emptyWeeks,
  environmentTitle,
  environmentFrom,
  lastEnvironment,
}: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // 表示回数を計測(マウント時に1回)。GA とは別に日次シグナルも送る。
  // GA は Grafana から読めないので、7日以内に記録したかを DB 側で突き合わせるため
  // (D4_WINBACK_PLAN.md §5.3)。
  useEffect(() => {
    sendGAEvent("event", "winback_card_impression", { empty_weeks: emptyWeeks });
    void sendDailyActivity([ACTIVITY_WINBACK_CARD]);
  }, [emptyWeeks]);

  /*
   * 閉じたら、次にホームを開いたときの骨格からも外す。
   * cookie は同期で直し(すぐリロードされても効く)、サーバが組み立てる構成(pinnedIds)は
   * router.refresh() で取り直す(「記録中」カードと同じ手順)。
   */
  useEffect(() => {
    if (!dismissed) return;

    dropBlocksFromStoredLayout(["winback"]);
    router.refresh();
  }, [dismissed, router]);

  if (dismissed) return null;

  function handleDismiss() {
    sendGAEvent("event", "winback_card_dismiss", { empty_weeks: emptyWeeks });
    writeClientCookie(WINBACK_DISMISSED_COOKIE, "1", WINBACK_DISMISSED_COOKIE_MAX_AGE);
    setDismissed(true);
  }

  return (
    <Card className="border-2 border-primary bg-primary/5">
      <CardBody className="p-5 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-primary tracking-wider">おかえりなさい</span>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              radius="full"
              aria-label="このカードを閉じる"
              className="-mr-2 -mt-1 shrink-0"
              onPress={handleDismiss}
            >
              <LuX className="text-medium text-default-400" />
            </Button>
          </div>
          <h2 className="text-lg font-bold">
            最後の対戦は {weekRangeLabel(lastWeek)} の週
            <span className="block">（{emptyWeeks}週間ぶり）</span>
          </h2>
          <p className="text-sm text-default-500">
            いまは『{environmentTitle}』環境です（{monthDay(environmentFrom)}〜）
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            as={Link}
            href="/records/create"
            color="primary"
            size="lg"
            radius="full"
            startContent={<LuFilePen className="w-4 h-4" />}
            className="font-bold shadow-md sm:self-start"
            onPress={() =>
              sendGAEvent("event", "winback_card_record_click", { empty_weeks: emptyWeeks })
            }
          >
            今日の対戦を記録する
          </Button>
          <p className="text-xs text-default-500">
            休んでいた間の大会も、日付を選んであとから記録できます
          </p>
        </div>

        {lastEnvironment && (
          <Link
            href={`/users/report/environments/${encodeURIComponent(lastEnvironment.id)}`}
            className="inline-flex items-center gap-1 text-sm font-bold text-primary self-start"
            onClick={() =>
              sendGAEvent("event", "winback_card_report_click", { empty_weeks: emptyWeeks })
            }
          >
            『{lastEnvironment.title}』のバトルレポート
            <LuChevronRight className="w-4 h-4" />
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
