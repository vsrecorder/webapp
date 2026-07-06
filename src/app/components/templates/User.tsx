"use client";

import { useEffect, useState } from "react";

import UserIdentityCard from "@app/components/organisms/User/UserIdentityCard";
import PlayerLinkCard from "@app/components/organisms/User/PlayerLinkCard";
import BadgeGallery from "@app/components/organisms/Badge/BadgeGallery";
import DesignationPanel from "@app/components/organisms/Designation/DesignationPanel";
import { ChampionshipSeriesType } from "@app/types/championship_series";

type Props = {
  id: string;
};

export default function TemplateUser({ id }: Props) {
  const [championshipSeries, setChampionshipSeries] = useState<ChampionshipSeriesType[]>(
    [],
  );

  useEffect(() => {
    fetch(`/api/championship_series`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setChampionshipSeries(data))
      .catch(() => setChampionshipSeries([]));
  }, []);

  return (
    <div className="pt-3 pb-6 max-w-2xl mx-auto w-full flex flex-col gap-3">
      <UserIdentityCard userId={id} />
      <PlayerLinkCard />
      <DesignationPanel userId={id} championshipSeries={championshipSeries} />
      <BadgeGallery userId={id} championshipSeries={championshipSeries} />
    </div>
  );
}
