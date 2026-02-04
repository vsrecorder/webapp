import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import TemplateRecordCreate from "@app/components/templates/RecordCreate";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <TemplateRecordCreate />;
}
