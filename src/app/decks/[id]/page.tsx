import { auth } from "@app/auth";
import { redirectToSignIn, type SearchParams } from "@app/utils/signInReturnServer";

import TemplateDeckById from "@app/components/templates/DeckById";
import { isValueMeterEnabled } from "@app/utils/featureFlags";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParams>;
};

export default async function Page({ params, searchParams }: Props) {
  const session = await auth();
  const { id } = await params;
  if (!session) {
    redirectToSignIn(`/decks/${encodeURIComponent(id)}`, await searchParams);
  }


  return (
    <TemplateDeckById id={id} valueMeterEnabled={isValueMeterEnabled()} />
  );
}
