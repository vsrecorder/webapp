import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  const { id } = await params;

  return <>{id}</>;
}
