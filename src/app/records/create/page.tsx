import { auth } from "@app/auth";
import { redirect } from "next/navigation";

import TemplateRecordCreate from "@app/components/templates/RecordCreate";

type Props = {
  searchParams: Promise<{
    deck_id?: string;
    deck_code_id?: string;
    event_type?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { deck_id, deck_code_id, event_type } = await searchParams;

  return (
    <>
      <TemplateRecordCreate
        deck_id={deck_id ? deck_id : ""}
        deck_code_id={deck_code_id ? deck_code_id : ""}
        tab={event_type === "tonamel" || event_type === "unofficial" ? event_type : "official"}
      />
    </>
  );
}
