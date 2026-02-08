import { auth } from "@app/(default)/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();
  if (!session) {
    redirect("/");
  }

  return <div>ユーザID: {session.user.id}</div>;
}
