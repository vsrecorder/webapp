import Link from "next/link";
import { Button } from "@heroui/react";

import Footer from "@app/components/organisms/Layout/Footer";
import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";
import DashboardCalendar from "@app/components/organisms/Calendar/DashboardCalendar";
import Records from "@app/components/organisms/Record/Records";
import UserStatPanel from "@app/components/organisms/UserStat/UserStatPanel";
import UserStatHistoryChart from "@app/components/organisms/UserStat/UserStatHistoryChart";
import DeckUsagePanel from "@app/components/organisms/DeckUsage/DeckUsagePanel";
import OpponentDeckUsagePanel from "@app/components/organisms/DeckUsage/OpponentDeckUsagePanel";
import UserProfileCard from "@app/components/organisms/User/UserProfileCard";
import DashboardSections, {
  DashboardSection,
} from "@app/components/organisms/Dashboard/DashboardSections";

import { CityleagueScheduleType } from "@app/types/cityleague_schedule";
import { EnvironmentType } from "@app/types/environment";
import { UserType } from "@app/types/user";

async function getCityleagueScheduleByDate(date: Date): Promise<CityleagueScheduleType> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const today = date.toISOString().split("T")[0];

  const res = await fetch(
    `https://${domain}/api/v1beta/cityleague_schedules?date=${today}`,
    {
      cache: "no-store",
      method: "GET",
      headers: { Accept: "application/json" },
    },
  );

  if (res.status === 200) return res.json();
  throw new Error("not found");
}

async function getEnvironmentByDate(date: Date): Promise<EnvironmentType> {
  const domain = process.env.VSRECORDER_DOMAIN;
  const today = date.toISOString().split("T")[0];

  const res = await fetch(`https://${domain}/api/v1beta/environments?date=${today}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  throw new Error("error");
}

type Props = {
  userId: string;
};

async function getUser(userId: string): Promise<UserType | null> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/users/${userId}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return null;
}

async function getAllEnvironments(): Promise<EnvironmentType[]> {
  const domain = process.env.VSRECORDER_DOMAIN;

  const res = await fetch(`https://${domain}/api/v1beta/environments`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 200) return res.json();
  return [];
}

export default async function TemplateDashboard({ userId }: Props) {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);

  let cs: CityleagueScheduleType | undefined;
  try {
    cs = await getCityleagueScheduleByDate(date);
  } catch {
    cs = undefined;
  }

  let env: EnvironmentType | undefined;
  try {
    env = await getEnvironmentByDate(date);
  } catch {
    env = undefined;
  }

  const environments = await getAllEnvironments();
  const user = await getUser(userId);

  const sections: DashboardSection[] = [];

  // 本日のシティリーグ
  if (cs) {
    sections.push({
      id: "cityleague",
      label: "本日のシティリーグ",
      node: (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-default-700">{cs.title} 開催中</h2>
            <Button
              as={Link}
              href="/cityleague_results"
              size="sm"
              variant="light"
              color="primary"
              radius="full"
              className="text-xs font-bold h-7 px-3"
            >
              結果を見る
            </Button>
          </div>
          <CityleagueEvents />
        </section>
      ),
    });
  }

  // 戦績分析
  sections.push({
    id: "stats",
    label: "戦績分析",
    node: (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">戦績分析</h2>
        <UserStatPanel
          userId={userId}
          environments={environments}
          currentEnvironmentId={env?.id}
          userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
        />
      </section>
    ),
  });

  // 勝率の推移
  sections.push({
    id: "stats_history",
    label: "勝率の推移",
    node: (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">勝率の推移</h2>
        <UserStatHistoryChart
          userId={userId}
          userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
        />
      </section>
    ),
  });

  // デッキ使用率分析
  sections.push({
    id: "deck_usage",
    label: "デッキ使用率分析",
    node: (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">デッキ使用率分析</h2>
        <DeckUsagePanel
          userId={userId}
          environments={environments}
          currentEnvironmentId={env?.id}
          userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
        />
      </section>
    ),
  });

  // 対戦相手のデッキ分布
  sections.push({
    id: "opponent_deck_usage",
    label: "対戦相手のデッキ分布",
    node: (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">対戦相手のデッキ分布</h2>
        <OpponentDeckUsagePanel
          userId={userId}
          environments={environments}
          currentEnvironmentId={env?.id}
          userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
        />
      </section>
    ),
  });

  // 活動カレンダー
  sections.push({
    id: "calendar",
    label: "活動カレンダー",
    node: (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-default-700">活動カレンダー</h2>
        <DashboardCalendar userId={userId} />
      </section>
    ),
  });

  const recentRecords = (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-default-700">最近の記録</h2>
        <Button
          as={Link}
          href="/records"
          size="sm"
          variant="light"
          color="primary"
          radius="full"
          className="text-xs font-bold h-7 px-3"
        >
          すべて見る
        </Button>
      </div>
      <Records event_type="all" disable_more_load={true} limit={10} />
    </section>
  );

  return (
    <>
      <div className="flex flex-col pt-2 gap-3 max-w-2xl mx-auto w-full">
        <DashboardSections
          pinned={user ? <UserProfileCard user={user} /> : undefined}
          sections={sections}
          trailing={recentRecords}
        />
      </div>

      <Footer />
    </>
  );
}
