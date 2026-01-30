import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import CityleagueResultByOfficialEventId from "@app/components/templates/CityleagueResultByOfficialEventId";

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

  return <CityleagueResultByOfficialEventId id={Number(id)} />;
}
