import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import Records from "@app/components/templates/Records";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <Records />;
}
