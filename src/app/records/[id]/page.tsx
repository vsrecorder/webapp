import { auth } from "@app/auth";
import { redirectToSignIn, type SearchParams } from "@app/utils/signInReturnServer";

import TemplateRecordById from "@app/components/templates/RecordById";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<SearchParams>;
};

export default async function Page({ params, searchParams }: Props) {
  const session = await auth();
  const { id } = await params;
  if (!session) {
    redirectToSignIn(`/records/${encodeURIComponent(id)}`, await searchParams);
  }


  return <TemplateRecordById id={id} />;
}
