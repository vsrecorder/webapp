import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import TemplateDecks from "@app/components/templates/Decks";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <TemplateDecks />;
}
