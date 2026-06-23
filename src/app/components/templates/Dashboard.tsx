import Link from "next/link";
import { Button } from "@heroui/react";
import { LuFilePen, LuLayers, LuFileText, LuTrophy } from "react-icons/lu";

import Footer from "@app/components/organisms/Layout/Footer";
import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";
import Records from "@app/components/organisms/Record/Records";
import UserStatPanel from "@app/components/organisms/UserStat/UserStatPanel";
import UserStatHistoryChart from "@app/components/organisms/UserStat/UserStatHistoryChart";

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

const quickActions = [
  {
    href: "/records/create",
    icon: LuFilePen,
    label: "記録を作成",
    color: "primary" as const,
  },
  {
    href: "/decks",
    icon: LuLayers,
    label: "デッキ管理",
    color: "default" as const,
  },
  {
    href: "/records",
    icon: LuFileText,
    label: "記録一覧",
    color: "default" as const,
  },
  {
    href: "/cityleague_results",
    icon: LuTrophy,
    label: "大会結果",
    color: "default" as const,
  },
];

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

  return (
    <>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
        {/* 環境バッジ */}
        {env && (
          <div className="flex justify-center pt-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              現在の環境：『{env.title}』
            </div>
          </div>
        )}

        {/* クイックアクション */}
        <section className="grid grid-cols-4 gap-2">
          {quickActions.map(({ href, icon: Icon, label, color }) => (
            <Button
              key={href}
              as={Link}
              href={href}
              color={color}
              variant={color === "primary" ? "solid" : "flat"}
              className="flex flex-col h-auto py-3 gap-1.5"
              radius="lg"
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-bold leading-none">{label}</span>
            </Button>
          ))}
        </section>

        {/* 本日のシティリーグ */}
        {cs && (
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
        )}

        {/* 戦績分析 */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-default-700">戦績分析</h2>
          <UserStatPanel
            userId={userId}
            environments={environments}
            currentEnvironmentId={env?.id}
            userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
          />
          <UserStatHistoryChart
            userId={userId}
            userCreatedAt={user?.created_at != null ? String(user.created_at) : undefined}
          />
        </section>

        {/* 最近の記録 */}
        <section className="flex flex-col gap-3">
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
          <Records event_type="official" disable_more_load={true} limit={5} />
        </section>
      </div>

      <Footer />
    </>
  );
}
