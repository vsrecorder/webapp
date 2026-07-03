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

  // event_type が明示指定されていない場合は undefined を渡し、
  // クライアント側でセッション内の最終選択タブを復元できるようにする。
  const tab =
    event_type === "official" || event_type === "tonamel" || event_type === "unofficial"
      ? event_type
      : undefined;

  return (
    <>
      <TemplateRecordCreate
        deck_id={deck_id ? deck_id : ""}
        deck_code_id={deck_code_id ? deck_code_id : ""}
        tab={tab}
      />
    </>
  );
}
