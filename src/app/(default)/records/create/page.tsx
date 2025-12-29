import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import CreateRecord from "@app/(default)/components/CreateRecord";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <CreateRecord />;
}
