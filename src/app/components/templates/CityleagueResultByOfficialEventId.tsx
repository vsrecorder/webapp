import ResultByOfficialEventId from "@app/components/organisms/Cityleague/CityleagueResultByOfficialEventId";

import { CityleagueResultType } from "@app/types/cityleague_result";
import { DeckSummaryType } from "@app/types/deckcard";
import { OfficialEventType } from "@app/types/official_event";

type Props = {
  event: OfficialEventType;
  cityleagueResult: CityleagueResultType;
  deckSummaries?: Record<string, DeckSummaryType>;
  relatedSection?: React.ReactNode;
};

export default function TemplateCityleagueResultByOfficialEventId({
  event,
  cityleagueResult,
  deckSummaries,
  relatedSection,
}: Props) {
  return (
    <ResultByOfficialEventId
      event={event}
      cityleagueResult={cityleagueResult}
      deckSummaries={deckSummaries}
      relatedSection={relatedSection}
    />
  );
}
