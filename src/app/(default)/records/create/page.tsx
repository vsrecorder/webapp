import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

import TemplateRecordCreate from "@app/components/templates/RecordCreate";

type Props = {
  searchParams: Promise<{
    deck_id?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { deck_id } = await searchParams;

  return (
    <>
      <TemplateRecordCreate deck_id={deck_id ? deck_id : ""} />
    </>
  );
}
