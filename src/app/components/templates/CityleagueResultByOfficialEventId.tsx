import ResultByOfficialEventId from "@app/components/organisms/Cityleague/CityleagueResultByOfficialEventId";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { OfficialEventType } from "@app/types/official_event";

type Props = {
  event: OfficialEventType;
  cityleagueResult: CityleagueResultType;
};

export default function TemplateCityleagueResultByOfficialEventId({
  event,
  cityleagueResult,
}: Props) {
  return <ResultByOfficialEventId event={event} cityleagueResult={cityleagueResult} />;
}
