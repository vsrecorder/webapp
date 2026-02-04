import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import TemplateRecords from "@app/components/templates/Records";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <TemplateRecords />;
}
