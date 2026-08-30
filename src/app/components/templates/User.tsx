"use client";

import UserIdentityCard from "@app/components/organisms/User/UserIdentityCard";
import PlayerLinkCard from "@app/components/organisms/User/PlayerLinkCard";
import BadgeGallery from "@app/components/organisms/Badge/BadgeGallery";
import EnvironmentBadgeGallery from "@app/components/organisms/Badge/EnvironmentBadgeGallery";
import DesignationPanel from "@app/components/organisms/Designation/DesignationPanel";
import { ChampionshipSeriesType } from "@app/types/championship_series";

type Props = {
  id: string;
  // ページ(サーバ側)で取得済みの一覧。DesignationPanel / BadgeGallery はこの一覧から
  // 現在シーズンを決めてデータを取得するため、最初から揃った状態で渡す(users/page.tsx 参照)。
  championshipSeries: ChampionshipSeriesType[];
};

export default function TemplateUser({ id, championshipSeries }: Props) {
  return (
    <div className="pt-3 pb-6 max-w-2xl mx-auto w-full flex flex-col gap-3">
      <UserIdentityCard userId={id} />
      <PlayerLinkCard />
      <DesignationPanel userId={id} championshipSeries={championshipSeries} />
      <BadgeGallery userId={id} championshipSeries={championshipSeries} />
      <EnvironmentBadgeGallery userId={id} />
    </div>
  );
}
