"use client";

import ResultByOfficialEventId from "@app/components/organisms/CityleagueResultByOfficialEventId";

type Props = {
  id: number;
};

export default function TemplateCityleagueResultByOfficialEventId({ id }: Props) {
  return <ResultByOfficialEventId id={id} />;
}
