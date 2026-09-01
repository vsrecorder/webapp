import { auth } from "@app/auth";
import { redirect } from "next/navigation";

import TemplateRecordCreate from "@app/components/templates/RecordCreate";

type Props = {
  searchParams: Promise<{
    deck_id?: string;
    deck_code_id?: string;
    event_type?: string;
    // 公式イベントの指定(Myジムのイベント詳細などからの遷移)
    official_event_id?: string;
    event_date?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { deck_id, deck_code_id, event_type, official_event_id, event_date } =
    await searchParams;

  // event_type が明示指定されていない場合は undefined を渡し、
  // クライアント側でセッション内の最終選択タブを復元できるようにする。
  // ただし公式イベントの指定がある遷移は、そのイベントを選ばせるのが目的なので
  // event_type の有無にかかわらず公式イベントタブで開く。
  const tab = official_event_id
    ? "official"
    : event_type === "official" ||
        event_type === "tonamel" ||
        event_type === "unofficial"
      ? event_type
      : undefined;

  return (
    <>
      <TemplateRecordCreate
        deck_id={deck_id ? deck_id : ""}
        deck_code_id={deck_code_id ? deck_code_id : ""}
        tab={tab}
        official_event_id={official_event_id}
        event_date={event_date}
      />
    </>
  );
}
