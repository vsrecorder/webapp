"use client";

import { useEffect, useState } from "react";
import { Input } from "@heroui/react";

import UserIdentityCard from "@app/components/organisms/User/UserIdentityCard";
import PlayerLinkCard from "@app/components/organisms/User/PlayerLinkCard";
import BadgeGallery from "@app/components/organisms/Badge/BadgeGallery";
import DesignationPanel from "@app/components/organisms/Designation/DesignationPanel";
import { ChampionshipSeriesType } from "@app/types/championship_series";

type Props = {
  id: string;
};

export default function TemplateUser({ id }: Props) {
  const [championshipSeries, setChampionshipSeries] = useState<ChampionshipSeriesType[]>([]);

  useEffect(() => {
    fetch(`/api/championship_series`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setChampionshipSeries(data))
      .catch(() => setChampionshipSeries([]));
  }, []);

  return (
    <>
      <div className="pt-2 max-w-2xl mx-auto w-full flex flex-col gap-3">
        <UserIdentityCard userId={id} />
        <PlayerLinkCard />
        <DesignationPanel userId={id} championshipSeries={championshipSeries} />
        <BadgeGallery userId={id} championshipSeries={championshipSeries} />
      </div>

      <Input
        type="file"
        //variant="unstyled"
        accept="image/png, image/jpeg, image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();

            reader.onload = (e) => {
              if (!e.target || !e.target.result) {
                //setCropImage("");
                return;
              }

              //setCropImage(e.target.result.toString());
            };

            reader.readAsDataURL(e.target.files[0]);
            e.target.value = "";

            //onOpenCropper();
          }
        }}
      />
    </>
  );
}
