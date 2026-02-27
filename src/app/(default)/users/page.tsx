import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import TemplateUser from "@app/components/templates/User";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <TemplateUser id={session.user.id} />;
}
