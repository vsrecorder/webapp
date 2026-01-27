import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import CityleagueResults from "@app/components/templates/CityleagueResults";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <CityleagueResults />;
}
