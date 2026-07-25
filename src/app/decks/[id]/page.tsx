import { auth } from "@app/auth";
import { redirect } from "next/navigation";

import TemplateDeckById from "@app/components/templates/DeckById";
import { isValueMeterEnabled } from "@app/utils/featureFlags";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { id } = await params;

  return (
    <TemplateDeckById id={id} valueMeterEnabled={isValueMeterEnabled()} />
  );
}
